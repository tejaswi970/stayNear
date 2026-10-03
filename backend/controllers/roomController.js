const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { v4: uuidv4 } = require('uuid');

const fail = (error, fallback) => {
  if (error) throw new AppError(error.message || fallback, /not your request/i.test(error.message) ? 403 : 400);
};

exports.createRequest = async (req, res, next) => {
  try {
    await supabase.rpc('refresh_expired_room_requests');
    const { room_id, move_in_date, people_count = 1, room_count = 1, message, contact_phone } = req.body;
    if (!room_id || !/^\d{4}-\d{2}-\d{2}$/.test(move_in_date || '') || new Date(move_in_date) < new Date(new Date().toDateString())) {
      throw new AppError('Choose a valid room and move-in date.', 400);
    }
    if (contact_phone) {
      const { error: profileError } = await supabase.from('users').update({ phone: String(contact_phone).slice(0, 40) }).eq('id', req.user.id);
      if (profileError) throw new AppError('Could not save your contact phone.', 400);
    }
    const requestedRooms = Math.max(1, Math.min(500, parseInt(room_count, 10) || 1));
    let { data, error } = await supabase.rpc('create_room_request_with_quantity', {
      p_user_id: req.user.id, p_room_id: room_id, p_move_in_date: move_in_date,
      p_people_count: Math.max(1, Number(people_count) || 1), p_message: (message || '').slice(0, 1000),
      p_room_count: requestedRooms,
    });
    if (error && ['PGRST202', '42883'].includes(error.code)) {
      if (requestedRooms > 1) throw new AppError('Multiple room bookings are not enabled yet. Run database/room_quantities.sql in Supabase.', 503);
      ({ data, error } = await supabase.rpc('create_room_request', {
        p_user_id: req.user.id, p_room_id: room_id, p_move_in_date: move_in_date,
        p_people_count: Math.max(1, Number(people_count) || 1), p_message: (message || '').slice(0, 1000),
      }));
    }
    if (error) fail(error, 'Could not create room request.');
    res.status(201).json({ success: true, data: { id: data, status: 'pending' } });
  } catch (err) { next(err); }
};

exports.getMyRequests = async (req, res, next) => {
  try {
    await supabase.rpc('refresh_expired_room_requests');
    const { data, error } = await supabase.from('room_requests')
      .select('*, pg:pg_id(name,upi_qr_path), room:room_id(room_number,room_type,monthly_rent_inr,deposit_inr), owner:owner_id(id,name,email,phone)')
      .eq('user_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw new AppError('Could not fetch your requests.', 500);
    const safe = await Promise.all((data || []).map(async item => {
      const pg = { name: item.pg?.name };
      if (item.status === 'confirmed' && item.pg?.upi_qr_path) {
        const { data: signed, error: signError } = await supabase.storage.from('booking-payment-files')
          .createSignedUrl(item.pg.upi_qr_path, 60 * 60);
        if (signError) console.error('Could not sign owner UPI QR URL:', signError.message);
        else pg.upi_qr_url = signed.signedUrl;
      }
      return {
        ...item,
        pg,
        owner: ['owner_accepted', 'confirmed'].includes(item.status) ? item.owner : { name: item.owner?.name },
      };
    }));
    res.json({ success: true, data: safe });
  } catch (err) { next(err); }
};

exports.getOwnerRequests = async (req, res, next) => {
  try {
    await supabase.rpc('refresh_expired_room_requests');
    const { data, error } = await supabase.from('room_requests')
      .select('*, pg:pg_id(name), room:room_id(room_number,room_type,monthly_rent_inr,deposit_inr), user:user_id(id,name,email,phone)')
      .eq('owner_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw new AppError('Could not fetch room requests.', 500);
    const safe = (data || []).map(item => ({
      ...item,
      user: item.status === 'confirmed' ? item.user : { name: item.user?.name },
    }));
    res.json({ success: true, data: safe });
  } catch (err) { next(err); }
};

exports.transition = async (req, res, next) => {
  try {
    const { data, error } = await supabase.rpc('transition_room_request', {
      p_request_id: req.params.id, p_actor_id: req.user.id, p_action: req.body.action,
    });
    if (error) fail(error, 'Could not update request.');
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const getConfirmedParticipantRequest = async (requestId, actorId) => {
  const { data: request, error } = await supabase.from('room_requests')
    .select('id,user_id,owner_id,status').eq('id', requestId).single();
  if (error || !request) throw new AppError('Room request not found.', 404);
  if (![request.user_id, request.owner_id].includes(actorId)) throw new AppError('You cannot access this conversation.', 403);
  if (request.status !== 'confirmed') throw new AppError('Chat is available after the owner confirms the booking.', 403);
  return request;
};

exports.getMessages = async (req, res, next) => {
  try {
    await getConfirmedParticipantRequest(req.params.id, req.user.id);
    const { data, error } = await supabase.from('room_request_messages')
      .select('id,request_id,sender_id,content,created_at')
      .eq('request_id', req.params.id).order('created_at', { ascending: true }).limit(500);
    if (error) throw new AppError(`Could not load the conversation: ${error.message}`, 500);
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
};

exports.sendMessage = async (req, res, next) => {
  try {
    await getConfirmedParticipantRequest(req.params.id, req.user.id);
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content || content.length > 2000) throw new AppError('Message must be between 1 and 2000 characters.', 400);
    const { data, error } = await supabase.from('room_request_messages')
      .insert({ request_id: req.params.id, sender_id: req.user.id, content })
      .select('id,request_id,sender_id,content,created_at').single();
    if (error) throw new AppError(`Could not send your message: ${error.message}`, 500);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const getConfirmedPaymentRequest = async (requestId, actorId) => {
  const { data: request, error } = await supabase.from('room_requests')
    .select('id,user_id,owner_id,status,room:room_id(monthly_rent_inr)')
    .eq('id', requestId).single();
  if (error || !request) throw new AppError('Room request not found.', 404);
  if (![request.user_id, request.owner_id].includes(actorId)) throw new AppError('You cannot access these payment details.', 403);
  if (request.status !== 'confirmed') throw new AppError('Payment details are available after the owner confirms the booking.', 403);
  return request;
};

const signedPaymentProofs = async proofs => Promise.all((proofs || []).map(async proof => {
  const { data, error } = await supabase.storage.from('booking-payment-files').createSignedUrl(proof.storage_path, 60 * 15);
  if (error) console.error('Could not sign payment proof URL:', error.message);
  const { storage_path, ...safeProof } = proof;
  return { ...safeProof, receipt_url: data?.signedUrl || null };
}));

exports.getPaymentProofs = async (req, res, next) => {
  try {
    await getConfirmedPaymentRequest(req.params.id, req.user.id);
    const { data, error } = await supabase.from('booking_payment_proofs')
      .select('id,request_id,user_id,owner_id,amount_inr,status,created_at,reviewed_at,storage_path')
      .eq('request_id', req.params.id).order('created_at', { ascending: false });
    if (error) throw new AppError('Could not load payment receipts.', 500);
    res.json({ success: true, data: await signedPaymentProofs(data) });
  } catch (err) { next(err); }
};

exports.uploadPaymentProof = async (req, res, next) => {
  let storagePath;
  try {
    const request = await getConfirmedPaymentRequest(req.params.id, req.user.id);
    if (request.user_id !== req.user.id) throw new AppError('Only the tenant can upload a payment receipt.', 403);
    if (!req.file) throw new AppError('Choose a payment receipt image or PDF.', 400);
    const amount = Number(req.body.amount_inr);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) throw new AppError('Enter a valid amount paid.', 400);
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }[req.file.mimetype];
    if (!extension) throw new AppError('Receipt must be a JPG, PNG, WEBP, or PDF file.', 400);
    storagePath = `proofs/${request.id}/${uuidv4()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('booking-payment-files').upload(storagePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (uploadError) throw new AppError(`Receipt upload failed: ${uploadError.message}`, 500);
    const { data, error } = await supabase.from('booking_payment_proofs').insert({
      request_id: request.id,
      user_id: request.user_id,
      owner_id: request.owner_id,
      amount_inr: amount,
      storage_path: storagePath,
    }).select('id,request_id,user_id,owner_id,amount_inr,status,created_at,reviewed_at,storage_path').single();
    if (error) throw new AppError('Could not save the payment receipt.', 500);
    res.status(201).json({ success: true, data: (await signedPaymentProofs([data]))[0] });
  } catch (err) {
    if (storagePath) {
      const { error } = await supabase.storage.from('booking-payment-files').remove([storagePath]);
      if (error) console.error('Could not clean up failed payment proof upload:', error.message);
    }
    next(err);
  }
};

exports.reviewPaymentProof = async (req, res, next) => {
  try {
    const request = await getConfirmedPaymentRequest(req.params.id, req.user.id);
    if (request.owner_id !== req.user.id) throw new AppError('Only the PG owner can review this receipt.', 403);
    const status = req.body.status;
    if (!['received', 'rejected'].includes(status)) throw new AppError('Choose received or rejected.', 400);
    const { data, error } = await supabase.from('booking_payment_proofs').update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', req.params.proofId).eq('request_id', request.id).eq('owner_id', req.user.id).eq('status', 'pending')
      .select('id,request_id,user_id,owner_id,amount_inr,status,created_at,reviewed_at,storage_path').maybeSingle();
    if (error) throw new AppError('Could not update the payment receipt.', 500);
    if (!data) throw new AppError('Pending receipt not found.', 404);
    res.json({ success: true, data: (await signedPaymentProofs([data]))[0] });
  } catch (err) { next(err); }
};

exports.getRooms = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('rooms').select('*').eq('pg_id', req.params.pgId).order('room_number');
    if (error) {
      console.error('Room inventory query failed:', error.code, error.message);
      const message = ['42P01', 'PGRST205'].includes(error.code)
        ? 'Room inventory is not installed. Run database/room_booking.sql in Supabase and reload the schema cache.'
        : `Could not fetch rooms: ${error.message}`;
      throw new AppError(message, 500);
    }
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
};

exports.uploadRoomImages = async (req, res, next) => {
  const uploadedPaths = [];
  try {
    const { id } = req.params;
    const { data: room, error: roomError } = await supabase.from('rooms')
      .select('id,pg_id,images,pg:pg_id(owner_id)').eq('id', id).single();
    if (roomError || !room) throw new AppError('Room not found.', 404);
    if (room.pg?.owner_id !== req.user.id) throw new AppError('You cannot upload photos for this room.', 403);
    if (!req.files?.length) throw new AppError('Choose at least one room photo.', 400);
    const urls = [];
    for (const file of req.files) {
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.mimetype];
      if (!ext) throw new AppError('Room photos must be JPG, PNG, or WEBP.', 400);
      const path = `${room.pg_id}/rooms/${room.id}/${uuidv4()}.${ext}`;
      const { data: uploaded, error } = await supabase.storage.from('pg-images').upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
      if (error) throw new AppError(`Room photo upload failed: ${error.message}`, 500);
      uploadedPaths.push(uploaded.path);
      const { data: publicUrl } = supabase.storage.from('pg-images').getPublicUrl(uploaded.path);
      urls.push(publicUrl.publicUrl);
    }
    const { data, error } = await supabase.from('rooms').update({ images: [...(room.images || []), ...urls] }).eq('id', id).select('*').single();
    if (error) throw new AppError(`Could not save room photos: ${error.message}`, 500);
    res.json({ success: true, data: { images: data.images || [] } });
  } catch (err) {
    if (uploadedPaths.length) {
      const { error } = await supabase.storage.from('pg-images').remove(uploadedPaths);
      if (error) console.error('Could not clean up failed room photo upload:', error.message);
    }
    next(err);
  }
};

exports.manageRoom = async (req, res, next) => {
  try {
    const { pg_id, room_number, room_type, monthly_rent_inr, deposit_inr, status } = req.body;
    const { data: pg } = await supabase.from('pg_listings').select('owner_id').eq('id', pg_id).single();
    if (!pg || pg.owner_id !== req.user.id) throw new AppError('You cannot manage rooms for this listing.', 403);
    const payload = { room_number, room_type, monthly_rent_inr: Number(monthly_rent_inr), deposit_inr: deposit_inr ? Number(deposit_inr) : null };
    if (req.method === 'POST') {
      const { data, error } = await supabase.from('rooms').insert({ pg_id, ...payload }).select().single();
      if (error) throw new AppError(error.message || 'Could not add room.', 400);
      return res.status(201).json({ success: true, data });
    }
    const { data: existing } = await supabase.from('rooms').select('id,status').eq('id', req.params.id).eq('pg_id', pg_id).single();
    if (!existing) throw new AppError('Room not found.', 404);
    if (status !== undefined && (!['available','maintenance'].includes(status) || !['available','maintenance'].includes(existing.status))) throw new AppError('Only unrequested rooms can switch between available and maintenance.', 400);
    const update = { ...payload };
    if (status) update.status = status;
    const { data, error } = await supabase.from('rooms').update(update).eq('id', req.params.id).select().single();
    if (error) throw new AppError(error.message || 'Could not update room.', 400);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.deleteRoom = async (req, res, next) => {
  try {
    const { pg_id } = req.body;
    const { data: pg } = await supabase.from('pg_listings').select('owner_id').eq('id', pg_id).single();
    if (!pg || pg.owner_id !== req.user.id) throw new AppError('You cannot manage rooms for this listing.', 403);
    const { data: room } = await supabase.from('rooms').select('id,status').eq('id', req.params.id).eq('pg_id', pg_id).single();
    if (!room) throw new AppError('Room not found.', 404);
    if (!['available', 'maintenance'].includes(room.status)) throw new AppError('A requested or booked room cannot be deleted.', 409);
    const { data: requests, error: requestError } = await supabase.from('room_requests').select('id').eq('room_id', room.id).limit(1);
    if (requestError) throw new AppError(`Could not check room history: ${requestError.message}`, 500);
    if (requests?.length) throw new AppError('A room with request history cannot be deleted.', 409);
    const { error } = await supabase.from('rooms').delete().eq('id', room.id).eq('pg_id', pg_id);
    if (error) throw new AppError(`Could not delete room: ${error.message}`, 500);
    res.json({ success: true, message: 'Room deleted.' });
  } catch (err) { next(err); }
};

exports.adminRequests = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('room_requests')
      .select('*, pg:pg_id(name), room:room_id(room_number), user:user_id(name,email), owner:owner_id(name,email)')
      .order('created_at', { ascending: false });
    if (error) throw new AppError('Could not fetch all room requests.', 500);
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
};

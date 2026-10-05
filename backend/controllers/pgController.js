const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { v4: uuidv4 } = require('uuid');
const { DEMO_LISTING_FILTER, isDemoListing } = require('../utils/demoData');

const ALLOWED_AMENITIES = ['wifi', 'food', 'parking', 'laundry', 'ac', 'attached_bathroom', 'furnished'];
const PUBLIC_PG_FIELDS = 'id,name,description,location,address,rent,deposit,maintenance,electricity,food_cost,room_type,amenities,images,availability,verified,verification_status,created_at,updated_at';

exports.getPGs = async (req, res, next) => {
  try {
    const {
      search, location, maxRent, roomType, food, wifi,
      parking, laundry, ac, attachedBathroom, furnished,
      availability, verificationStatus, verified, page = 1, limit = 12
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('pg_listings')
      .select(PUBLIC_PG_FIELDS, { count: 'exact' })
      .not('id', 'in', DEMO_LISTING_FILTER);

    // Text search
    if (search) {
      const term = search.trim().replace(/[%_]/g, '\\$&');
      query = query.or(`name.ilike.%${term}%,location.ilike.%${term}%,address.ilike.%${term}%`);
    }

    // Location filter
    if (location) {
      const loc = location.trim().replace(/[%_]/g, '\\$&');
      query = query.ilike('location', `%${loc}%`);
    }

    // Max rent
    if (maxRent) {
      const rentNum = parseFloat(maxRent);
      if (!isNaN(rentNum)) query = query.lte('rent', rentNum);
    }

    // Room type
    const validRoomTypes = ['single', '2-sharing', '3-sharing', '4-sharing'];
    if (roomType && validRoomTypes.includes(roomType)) {
      query = query.eq('room_type', roomType);
    }

    // Availability
    const validAvailability = ['available', 'few_rooms', 'full'];
    if (availability && validAvailability.includes(availability)) {
      query = query.eq('availability', availability);
    }

    if (verificationStatus && ['pending', 'verified', 'rejected'].includes(verificationStatus)) {
      query = query.eq('verification_status', verificationStatus);
    } else if (verified === 'true') {
      query = query.eq('verification_status', 'verified');
    }

    // Amenity filters (JSONB)
    const amenityFilters = { food, wifi, parking, laundry, ac };
    const attachedBathroomFilter = attachedBathroom;
    const furnishedFilter = furnished;

    for (const [key, val] of Object.entries(amenityFilters)) {
      if (val === 'true') {
        query = query.eq(`amenities->>${key}`, 'true');
      }
    }
    if (attachedBathroomFilter === 'true') {
      query = query.eq('amenities->>attached_bathroom', 'true');
    }
    if (furnishedFilter === 'true') {
      query = query.eq('amenities->>furnished', 'true');
    }

    query = query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) throw new AppError('Failed to fetch PG listings.', 500);

    const ids = (data || []).map(item => item.id);
    let { data: roomRows, error: roomError } = ids.length ? await supabase.from('rooms').select('pg_id,status,room_type,images').in('pg_id', ids) : { data: [], error: null };
    if (roomError && ['42703', 'PGRST204'].includes(roomError.code)) {
      const fallback = ids.length ? await supabase.from('rooms').select('pg_id,status,room_type').in('pg_id', ids) : { data: [], error: null };
      roomRows = fallback.data;
      roomError = fallback.error;
    }
    if (roomError && !['42P01', 'PGRST205'].includes(roomError.code)) {
      console.error('Room counts query failed:', roomError.code, roomError.message);
    }
    const counts = new Map();
    for (const room of roomRows || []) {
      const value = counts.get(room.pg_id) || { total: 0, available: 0, booked: 0, room_cover_image: null, room_type_counts: {} };
      value.total += 1;
      if (room.status === 'available') value.available += 1;
      if (['booked','sold'].includes(room.status)) value.booked += 1;
      const typeCounts = value.room_type_counts[room.room_type] || { total: 0, available: 0, booked: 0 };
      typeCounts.total += 1;
      if (room.status === 'available') typeCounts.available += 1;
      if (['booked', 'sold'].includes(room.status)) typeCounts.booked += 1;
      value.room_type_counts[room.room_type] = typeCounts;
      if (!value.room_cover_image && Array.isArray(room.images) && room.images.length) value.room_cover_image = room.images[0];
      counts.set(room.pg_id, value);
    }
    const listings = (data || []).map(item => {
      const room_counts = counts.get(item.id) || { total: 0, available: 0, booked: 0, room_cover_image: null, room_type_counts: {} };
      const { room_cover_image, room_type_counts, ...countsOnly } = room_counts;
      return { ...item, room_counts: countsOnly, room_type_counts, room_cover_image, availability: countsOnly.available === 0 ? 'full' : countsOnly.available <= 2 ? 'few_rooms' : 'available' };
    });

    res.json({
      success: true,
      data: listings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getPGById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('pg_listings')
      .select(PUBLIC_PG_FIELDS)
      .eq('id', id)
      .not('id', 'in', DEMO_LISTING_FILTER)
      .single();

    if (error || !data) throw new AppError('PG listing not found.', 404);

    const { data: rooms, error: roomError } = await supabase.from('rooms').select('*').eq('pg_id', id).order('room_number');
    const roomsTableMissing = roomError && ['42P01', 'PGRST205'].includes(roomError.code);
    if (roomError && !roomsTableMissing) {
      console.error('Room availability query failed:', roomError.code, roomError.message);
      throw new AppError(`Failed to fetch room availability: ${roomError.message}`, 500);
    }
    const roomCounts = (rooms || []).reduce((counts, room) => {
      counts.total += 1;
      if (room.status === 'available') counts.available += 1;
      if (['booked','sold'].includes(room.status)) counts.booked += 1;
      return counts;
    }, { total: 0, available: 0, booked: 0 });
    const publicData = { ...data, rooms: rooms || [], room_counts: roomCounts, rooms_setup_required: !!roomsTableMissing, owner: undefined };
    if (roomCounts.total) publicData.availability = roomCounts.available === 0 ? 'full' : roomCounts.available <= 2 ? 'few_rooms' : 'available';
    res.json({ success: true, data: publicData });
  } catch (err) {
    next(err);
  }
};

exports.createPG = async (req, res, next) => {
  try {
    const {
      name, description, location, address, rent, deposit,
      maintenance, electricity, food_cost, room_type, amenities,
      images, upi_qr_path
    } = req.body;

    if (upi_qr_path && !String(upi_qr_path).startsWith(`${req.user.id}/upi/`)) {
      throw new AppError('Invalid UPI QR upload.', 400);
    }

    // Sanitize amenities — only allow known keys
    const safeAmenities = {};
    if (amenities && typeof amenities === 'object') {
      for (const key of ALLOWED_AMENITIES) {
        safeAmenities[key] = !!amenities[key];
      }
    }

    const { data: listing, error } = await supabase.from('pg_listings').insert({
      owner_id: req.user.id, name, description, location, address, rent: parseFloat(rent), deposit,
      maintenance, electricity, food_cost, room_type, amenities: safeAmenities,
      images: Array.isArray(images) ? images : [],
      upi_qr_path: upi_qr_path || null,
      verified: false, verification_status: 'pending',
    }).select().single();
    if (error) throw new AppError(error.message || 'Failed to create PG listing.', 500);
    const rooms = Array.isArray(req.body.rooms) ? req.body.rooms : [];
    if (rooms.length) {
      const roomRows = rooms.map(room => ({
        pg_id: listing.id, room_number: room.room_number, room_type: room.room_type,
        monthly_rent_inr: Number(room.monthly_rent_inr),
        deposit_inr: room.deposit_inr ? Number(room.deposit_inr) : null,
      }));
      const { error: roomsError } = await supabase.from('rooms').insert(roomRows);
      if (roomsError) {
        await supabase.from('pg_listings').delete().eq('id', listing.id);
        throw new AppError(roomsError.message || 'Failed to create rooms for this PG.', 400);
      }
    }
    res.status(201).json({ success: true, data: listing });
  } catch (err) {
    next(err);
  }
};

exports.updatePG = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: existing } = await supabase
      .from('pg_listings')
      .select('owner_id,upi_qr_path')
      .eq('id', id)
      .single();

    if (!existing || isDemoListing(id)) throw new AppError('PG listing not found.', 404);
    if (existing.owner_id !== req.user.id) {
      throw new AppError('You are not authorized to edit this listing.', 403);
    }

    const {
      name, description, location, address, rent, deposit,
      maintenance, electricity, food_cost, room_type, amenities,
      images, upi_qr_path
    } = req.body;

    if (upi_qr_path !== undefined && upi_qr_path && !String(upi_qr_path).startsWith(`${req.user.id}/upi/`)) {
      throw new AppError('Invalid UPI QR upload.', 400);
    }

    const safeAmenities = {};
    if (amenities && typeof amenities === 'object') {
      for (const key of ALLOWED_AMENITIES) {
        safeAmenities[key] = !!amenities[key];
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (address !== undefined) updateData.address = address;
    if (rent !== undefined) updateData.rent = parseFloat(rent);
    if (deposit !== undefined) updateData.deposit = deposit ? parseFloat(deposit) : null;
    if (maintenance !== undefined) updateData.maintenance = maintenance ? parseFloat(maintenance) : null;
    if (electricity !== undefined) updateData.electricity = electricity ? parseFloat(electricity) : null;
    if (food_cost !== undefined) updateData.food_cost = food_cost ? parseFloat(food_cost) : null;
    if (room_type !== undefined) updateData.room_type = room_type;
    if (amenities !== undefined) updateData.amenities = safeAmenities;
    if (images !== undefined) updateData.images = Array.isArray(images) ? images : [];
    if (upi_qr_path !== undefined) updateData.upi_qr_path = upi_qr_path || null;

    const { data, error } = await supabase
      .from('pg_listings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError('Failed to update PG listing.', 500);

    if (upi_qr_path !== undefined && existing.upi_qr_path && existing.upi_qr_path !== (upi_qr_path || null)) {
      const { error: cleanupError } = await supabase.storage.from('booking-payment-files').remove([existing.upi_qr_path]);
      if (cleanupError) console.error('Could not remove replaced UPI QR:', cleanupError.message);
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deletePG = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: existing } = await supabase
      .from('pg_listings')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (!existing || isDemoListing(id)) throw new AppError('PG listing not found.', 404);
    if (existing.owner_id !== req.user.id) {
      throw new AppError('You are not authorized to delete this listing.', 403);
    }

    const { error } = await supabase
      .from('pg_listings')
      .delete()
      .eq('id', id);

    if (error) throw new AppError('Failed to delete PG listing.', 500);

    res.json({ success: true, message: 'PG listing deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.getOwnerPGs = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('pg_listings')
      .select('*')
      .eq('owner_id', req.user.id)
      .not('id', 'in', DEMO_LISTING_FILTER)
      .order('created_at', { ascending: false });

    if (error) throw new AppError('Failed to fetch your listings.', 500);

    const ids = (data || []).map(item => item.id);
    const { data: roomRows, error: roomError } = ids.length ? await supabase.from('rooms').select('pg_id,status,room_type').in('pg_id', ids) : { data: [], error: null };
    if (roomError && !['42P01', 'PGRST205'].includes(roomError.code)) {
      console.error('Owner room counts query failed:', roomError.code, roomError.message);
      throw new AppError(`Failed to fetch room counts: ${roomError.message}`, 500);
    }
    const counts = new Map();
    for (const room of roomRows || []) {
      const value = counts.get(room.pg_id) || { total: 0, available: 0, booked: 0, room_type_counts: {} };
      value.total += 1;
      if (room.status === 'available') value.available += 1;
      if (['booked', 'sold'].includes(room.status)) value.booked += 1;
      const typeCounts = value.room_type_counts[room.room_type] || { total: 0, available: 0, booked: 0 };
      typeCounts.total += 1;
      if (room.status === 'available') typeCounts.available += 1;
      if (['booked', 'sold'].includes(room.status)) typeCounts.booked += 1;
      value.room_type_counts[room.room_type] = typeCounts;
      counts.set(room.pg_id, value);
    }
    const listings = (data || []).map(item => {
      const room_counts = counts.get(item.id);
      const countsForListing = room_counts || { total: 0, available: 0, booked: 0, room_type_counts: {} };
      return { ...item, room_counts: countsForListing, availability: countsForListing.available === 0 ? 'full' : countsForListing.available <= 2 ? 'few_rooms' : 'available' };
    });
    res.json({ success: true, data: listings });
  } catch (err) {
    next(err);
  }
};

exports.uploadImages = async (req, res, next) => {
  const uploadedPaths = [];
  try {
    const { id } = req.params;

    const { data: existing } = await supabase
      .from('pg_listings')
      .select('owner_id, images')
      .eq('id', id)
      .single();

    if (!existing || isDemoListing(id)) throw new AppError('PG listing not found.', 404);
    if (existing.owner_id !== req.user.id) {
      throw new AppError('You are not authorized to upload images for this listing.', 403);
    }

    if (!req.files || req.files.length === 0) {
      throw new AppError('No images provided.', 400);
    }

    const uploadedUrls = [];
    for (const file of req.files) {
      const fileName = `${id}/${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pg-images')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        throw new AppError(`Image upload failed: ${uploadError.message}`, 500);
      }
      uploadedPaths.push(uploadData.path);

      const { data: publicUrl } = supabase.storage
        .from('pg-images')
        .getPublicUrl(uploadData.path);

      uploadedUrls.push(publicUrl.publicUrl);
    }

    if (uploadedUrls.length === 0) {
      throw new AppError('Failed to upload images.', 500);
    }

    const newImages = [...(existing.images || []), ...uploadedUrls];

    const { data, error } = await supabase
      .from('pg_listings')
      .update({ images: newImages })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError('Failed to update images.', 500);

    res.json({ success: true, data: { images: data.images } });
  } catch (err) {
    if (uploadedPaths.length) {
      const { error: cleanupError } = await supabase.storage.from('pg-images').remove(uploadedPaths);
      if (cleanupError) console.error('Could not clean up failed PG image upload:', cleanupError.message);
    }
    next(err);
  }
};

exports.uploadDraftImages = async (req, res, next) => {
  const uploadedPaths = [];
  try {
    if (!req.files || req.files.length === 0) throw new AppError('No images provided.', 400);
    const urls = [];
    for (const file of req.files) {
      const extension = (file.originalname.match(/\.[a-zA-Z0-9]{1,8}$/) || ['.img'])[0].toLowerCase();
      const fileName = `${req.user.id}/draft/${uuidv4()}${extension}`;
      const { data: uploaded, error } = await supabase.storage.from('pg-images').upload(fileName, file.buffer, { contentType: file.mimetype, upsert: false });
      if (error) throw new AppError(`Image upload failed: ${error.message}`, 500);
      uploadedPaths.push(uploaded.path);
      const { data: publicUrl } = supabase.storage.from('pg-images').getPublicUrl(uploaded.path);
      urls.push(publicUrl.publicUrl);
    }
    res.json({ success: true, data: { images: urls } });
  } catch (err) {
    if (uploadedPaths.length) {
      const { error: cleanupError } = await supabase.storage.from('pg-images').remove(uploadedPaths);
      if (cleanupError) console.error('Could not clean up failed draft image upload:', cleanupError.message);
    }
    next(err);
  }
};

exports.uploadDraftUPIQR = async (req, res, next) => {
  let uploadedPath;
  try {
    if (!req.file) throw new AppError('Select a UPI QR image to upload.', 400);
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[req.file.mimetype];
    if (!extension) throw new AppError('UPI QR must be a JPG, PNG, or WEBP image.', 400);
    uploadedPath = `${req.user.id}/upi/${uuidv4()}.${extension}`;
    const { error } = await supabase.storage.from('booking-payment-files').upload(uploadedPath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (error) throw new AppError(`UPI QR upload failed: ${error.message}`, 500);
    const { data, error: signedError } = await supabase.storage.from('booking-payment-files').createSignedUrl(uploadedPath, 60 * 60 * 24 * 30);
    if (signedError) throw new AppError('Could not prepare the UPI QR preview.', 500);
    res.json({ success: true, data: { path: uploadedPath, url: data.signedUrl } });
  } catch (err) {
    if (uploadedPath) {
      const { error } = await supabase.storage.from('booking-payment-files').remove([uploadedPath]);
      if (error) console.error('Could not clean up UPI QR upload:', error.message);
    }
    next(err);
  }
};

exports.getOwnerUPIQR = async (req, res, next) => {
  try {
    const { data: listing, error } = await supabase.from('pg_listings')
      .select('owner_id,upi_qr_path').eq('id', req.params.id).single();
    if (error || !listing || isDemoListing(req.params.id)) throw new AppError('PG listing not found.', 404);
    if (listing.owner_id !== req.user.id) throw new AppError('You cannot manage this listing.', 403);
    if (!listing.upi_qr_path) return res.json({ success: true, data: { path: null, url: null } });
    const { data, error: signError } = await supabase.storage.from('booking-payment-files')
      .createSignedUrl(listing.upi_qr_path, 60 * 60);
    if (signError) throw new AppError('Could not load the UPI QR image.', 500);
    res.json({ success: true, data: { path: listing.upi_qr_path, url: data.signedUrl } });
  } catch (err) { next(err); }
};

import asyncHandler from '../utils/asyncHandler.js';
import DeviceService from '../services/device.service.js';
import mongoose from 'mongoose';

export const registerDevice = asyncHandler(async (req, res) => {

  const device =
    await DeviceService.registerDevice(
      req.user._id,
      req.body
    );

  res.status(201).json({
    status: 'success',
    data: device
  });
});

export const getMyDevices = asyncHandler(async (req, res) => {

  const devices =
    await DeviceService.getUserDevices(
      req.user._id
    );

  res.json({
    status: 'success',
    data: devices
  });
});

export const revokeDevice = asyncHandler(async (req, res) => {

  await DeviceService.revokeDevice(
    req.user._id,
    req.params.deviceId
  );

  res.json({
    status: 'success'
  });
});

export const getDevicesByUserId = asyncHandler(async (req, res) => {
  const devices = await DeviceService.getUserDevices(req.params.userId);
  
  // Return list of devices with their public keys and active status
  const sanitizedDevices = devices.map(d => ({
    deviceId: d.deviceId,
    publicKey: d.publicKey,
    identityKey: d.identityKey,
    signedPreKey: d.signedPreKey,
    isActive: d.isActive
  }));

  res.json({
    status: 'success',
    data: sanitizedDevices
  });
});

export const getDevicesByUserIds = asyncHandler(async (req, res) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(422).json({
      status: 'fail',
      message: 'userIds must be a non-empty array'
    });
  }

  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length !== userIds.length) {
    return res.status(422).json({
      status: 'fail',
      message: 'userIds array contains duplicate values'
    });
  }

  const invalidIds = userIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
  if (invalidIds.length > 0) {
    return res.status(422).json({
      status: 'fail',
      message: `Invalid userIds: ${invalidIds.join(', ')}`
    });
  }

  const devices = await DeviceService.getDevicesByUserIds(userIds);
  
  const sanitizedDevices = devices.map(d => ({
    userId: d.user,
    deviceId: d.deviceId,
    publicKey: d.publicKey,
    identityKey: d.identityKey,
    signedPreKey: d.signedPreKey,
    isActive: d.isActive
  }));

  res.json({
    status: 'success',
    data: sanitizedDevices
  });
});
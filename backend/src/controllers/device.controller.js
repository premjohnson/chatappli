import asyncHandler from '../utils/asyncHandler.js';
import DeviceService from '../services/device.service.js';

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
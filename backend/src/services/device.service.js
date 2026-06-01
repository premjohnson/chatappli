import DeviceRepository from "../repositories/device.repository.js";

class DeviceService {

//register or update device for push notifications

  static async registerDevice(userId, deviceData) {

    return await DeviceRepository.upsertDevice(userId, deviceData);
  }
//get user's registered devices
  static async getUserDevices(userId) {

    return DeviceRepository.findUserDevices(userId);

  }
//revoke a device (logout from that device)
  static async revokeDevice(userId, deviceId) {

    const device =
      await DeviceRepository.findUserDevice(
        userId,
        deviceId
      );

    if (!device)
      throw new Error("Device not found");

    device.isActive = false;

    await DeviceRepository.save(device);

    return true;

  }

}

export default DeviceService;
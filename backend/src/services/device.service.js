import DeviceRepository from "../repositories/device.repository.js";

class DeviceService {

  /* ================= REGISTER DEVICE ================= */

  static async registerDevice(userId, deviceData) {

    const existing =
      await DeviceRepository.findByDeviceId(
        deviceData.deviceId
      );

    if (existing)
      throw new Error("Device already registered");

    return DeviceRepository.create({
      user: userId,
      deviceId: deviceData.deviceId,
      publicKey: deviceData.publicKey,
      identityKey: deviceData.identityKey,
      signedPreKey: deviceData.signedPreKey
    });

  }

  /* ================= GET USER DEVICES ================= */

  static async getUserDevices(userId) {

    return DeviceRepository.findUserDevices(userId);

  }

  /* ================= REVOKE DEVICE ================= */

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
import DeviceRepository from "../repositories/device.repository.js";

class DeviceService {

  /* ================= REGISTER DEVICE ================= */

  static async registerDevice(userId, deviceData) {
    // Uses atomic upsert to prevent check-then-act race conditions
    // and seamlessly handle device key rotations/re-logins.
    return await DeviceRepository.upsertDevice(userId, deviceData);
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
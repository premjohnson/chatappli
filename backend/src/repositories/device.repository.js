import Device from "../models/device.model.js";

class DeviceRepository {

  static async findByDeviceId(deviceId) {
    return Device.findOne({ deviceId });
  }

  static async create(data) {
    return Device.create(data);
  }

  static async upsertDevice(userId, deviceData) {
    const filter = { deviceId: deviceData.deviceId, user: userId };
    const update = {
      $set: {
        publicKey: deviceData.publicKey,
        identityKey: deviceData.identityKey,
        signedPreKey: deviceData.signedPreKey,
        isActive: true
      }
    };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    return Device.findOneAndUpdate(filter, update, options);
  }

  static async findUserDevices(userId) {
    return Device.find({
      user: userId,
      isActive: true
    });
  }

  static async findUserDevice(userId, deviceId) {
    return Device.findOne({
      user: userId,
      deviceId
    });
  }

  static async save(device) {
    return device.save();
  }

}

export default DeviceRepository;
import Device from "../models/device.model.js";

class DeviceRepository {

  static async findByDeviceId(deviceId) {
    return Device.findOne({ deviceId });
  }

  static async create(data) {
    return Device.create(data);
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
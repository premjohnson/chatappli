export interface Device {
    _id: string

    user: string

    deviceId: string

    publicKey: string

    identityKey: string

    signedPreKey: string

    isActive: boolean

    createdAt: string

    updatedAt: string
}

export interface RegisterDevicePayload {
    deviceId: string
    deviceClient?: string
    publicKey: string
    identityKey: string
    signedPreKey: string
}

/* ================= API RESPONSES ================= */

export interface DeviceResponse {
    status: "success"
    data: Device
}

export interface DevicesResponse {
    status: "success"
    data: Device[]
}
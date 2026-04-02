import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { getMyDevicesApi } from "../api/getMyDevices.api"
import { registerDeviceApi } from "../api/registerDevice.api"
import { revokeDeviceApi } from "../api/revokeDevice.api"

import type {
  Device,
  RegisterDevicePayload
} from "../types/device.types"


/* ======================================================
   GET USER DEVICES
====================================================== */

export const useDevices = () => {

  return useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: getMyDevicesApi
  })

}


/* ======================================================
   REGISTER DEVICE
====================================================== */

export const useRegisterDevice = () => {

  const queryClient = useQueryClient()

  return useMutation({

    mutationFn: (payload: RegisterDevicePayload) =>
      registerDeviceApi(payload),

    onSuccess: (device: Device) => {

      queryClient.setQueryData<Device[]>(
        ["devices"],
        (old = []) => [...old, device]
      )

    }

  })

}


/* ======================================================
   REVOKE DEVICE
====================================================== */

export const useRevokeDevice = () => {

  const queryClient = useQueryClient()

  return useMutation({

    mutationFn: (deviceId: string) =>
      revokeDeviceApi(deviceId),

    onSuccess: (_, deviceId) => {

      queryClient.setQueryData<Device[]>(
        ["devices"],
        (old = []) =>
          old.filter(d => d.deviceId !== deviceId)
      )

    }

  })

}
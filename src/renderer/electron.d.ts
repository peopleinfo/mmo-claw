import type { IpcEventMap, IpcRequestMap } from '../shared/ipc.types'

type ReqChannel = keyof IpcRequestMap
type EventChannel = keyof IpcEventMap

declare global {
  interface Window {
    electron: {
      invoke<C extends ReqChannel>(channel: C, payload?: IpcRequestMap[C][0]): Promise<IpcRequestMap[C][1]>
      on<C extends EventChannel>(channel: C, listener: (payload: IpcEventMap[C]) => void): () => void
    }
  }
}

export {}


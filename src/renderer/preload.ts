import { contextBridge, ipcRenderer } from 'electron'
import type { IpcEventMap, IpcRequestMap } from '../shared/ipc.types'

type ReqChannel = keyof IpcRequestMap
type EventChannel = keyof IpcEventMap

contextBridge.exposeInMainWorld('electron', {
  invoke: <C extends ReqChannel>(channel: C, payload?: IpcRequestMap[C][0]): Promise<IpcRequestMap[C][1]> =>
    ipcRenderer.invoke(channel, payload),
  on: <C extends EventChannel>(channel: C, listener: (payload: IpcEventMap[C]) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: IpcEventMap[C]) => listener(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
})

declare global {
  interface Window {
    electron: {
      invoke<C extends ReqChannel>(channel: C, payload?: IpcRequestMap[C][0]): Promise<IpcRequestMap[C][1]>
      on<C extends EventChannel>(channel: C, listener: (payload: IpcEventMap[C]) => void): () => void
    }
  }
}

export {}


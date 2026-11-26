declare global {
  interface Liveblocks {
    UserMeta: {
      id: string
      info: {
        name: string
        avatar?: string
      }
    }
    RoomEvent: {
      type: "EXECUTION_UPDATED"
      executionId: string
    }
  }
}

export {}

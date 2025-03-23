import { request } from './request';

export interface Room {
  id: number;
  cdkey: {
    key: string;
  };
  status: number;
  createdAt: string;
}

export interface RoomListResponse {
  rooms: Room[];
  total: number;
}

export interface RoomDetail {
  id: number
  cdkey: {
    key: string
    used: number
    total: number
  }
  createdAt: string
  status: number
}

export const roomApi = {
  // 获取房间列表
  getRooms: async (searchId?: string): Promise<RoomListResponse> => {
    return request<RoomListResponse>(`/admin/rooms${searchId ? `?id=${searchId}` : ''}`);
  },

  // 删除房间
  deleteRoom: async (roomId: number): Promise<void> => {
    return request<void>(`/admin/rooms/${roomId}`, {
      method: 'DELETE',
    });
  },

  getRoom: async (id: number): Promise<{room:RoomDetail}> => {
    return request(`/admin/rooms/${id}`, {
        method: 'GET'
    })
  }
};
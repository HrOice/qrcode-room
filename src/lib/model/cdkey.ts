
export type CDKey = {
    id: number;
    key: string;
    used: number;
    total: number;
    createdAt: Date;
    updatedAt: Date;
};

/**
 * 使用记录
 */
export type CDKeyRecord = {
    id: number;
    createdAt: Date;
    cdkeyId: number;
    ip: string;
};
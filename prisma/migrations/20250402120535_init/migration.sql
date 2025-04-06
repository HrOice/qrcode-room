-- CreateTable
CREATE TABLE "CDKey" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CDKeyRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cdkeyId" INTEGER NOT NULL,
    "ip" TEXT NOT NULL,
    "adminId" INTEGER,
    "status" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CDKeyRecord_cdkeyId_fkey" FOREIGN KEY ("cdkeyId") REFERENCES "CDKey" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Room" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ip" TEXT NOT NULL,
    "cdkeyId" INTEGER NOT NULL,
    "adminId" INTEGER,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "lastActive" DATETIME NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "socketId" TEXT,
    "adminSocketId" TEXT,
    CONSTRAINT "Room_cdkeyId_fkey" FOREIGN KEY ("cdkeyId") REFERENCES "CDKey" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CDKey_key_key" ON "CDKey"("key");

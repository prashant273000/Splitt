-- CreateEnum
CREATE TYPE "Destination" AS ENUM ('RAILWAY_STATION', 'BUS_STAND', 'CITY_CENTER', 'AIRPORT');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('FROM_CAMPUS', 'TO_CAMPUS');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('OPEN', 'FULL', 'DEPARTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "picture" TEXT,
    "phone" TEXT,
    "thumbsUp" INTEGER NOT NULL DEFAULT 0,
    "thumbsDown" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ride" (
    "id" TEXT NOT NULL,
    "posterId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "otherPoint" "Destination" NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "seatsTotal" INTEGER NOT NULL,
    "seatsAvailable" INTEGER NOT NULL,
    "farePerHead" INTEGER NOT NULL,
    "notes" TEXT,
    "status" "RideStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideParticipant" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "otherPoint" "Destination" NOT NULL,
    "earliestTime" TIMESTAMP(3) NOT NULL,
    "latestTime" TIMESTAMP(3) NOT NULL,
    "maxFare" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Intent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "posterConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "seekerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "thumbsUp" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Ride_status_departureTime_idx" ON "Ride"("status", "departureTime");

-- CreateIndex
CREATE INDEX "Ride_direction_otherPoint_departureTime_idx" ON "Ride"("direction", "otherPoint", "departureTime");

-- CreateIndex
CREATE UNIQUE INDEX "RideParticipant_rideId_userId_key" ON "RideParticipant"("rideId", "userId");

-- CreateIndex
CREATE INDEX "Intent_active_direction_otherPoint_earliestTime_latestTime_idx" ON "Intent"("active", "direction", "otherPoint", "earliestTime", "latestTime");

-- CreateIndex
CREATE UNIQUE INDEX "Match_rideId_intentId_key" ON "Match"("rideId", "intentId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_fromUserId_toUserId_rideId_key" ON "Rating"("fromUserId", "toUserId", "rideId");

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideParticipant" ADD CONSTRAINT "RideParticipant_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideParticipant" ADD CONSTRAINT "RideParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intent" ADD CONSTRAINT "Intent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "Intent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

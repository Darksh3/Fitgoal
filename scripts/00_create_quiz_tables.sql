-- CreateTable QuizVersion
CREATE TABLE "QuizVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    CONSTRAINT "QuizVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable QuizNode
CREATE TABLE "QuizNode" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuizNode_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "QuizNode_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuizVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable QuizEdge
CREATE TABLE "QuizEdge" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "conditions" JSONB,
    "operator" TEXT NOT NULL DEFAULT 'AND',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuizEdge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "QuizEdge_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuizVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizEdge_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "QuizNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizEdge_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "QuizNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable QuizResponse
CREATE TABLE "QuizResponse" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable QuizRun
CREATE TABLE "QuizRun" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "currentNodeId" TEXT,
    "status" TEXT NOT NULL,
    "score" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "QuizRun_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "QuizRun_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuizVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "versionId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuditLog_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuizVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "QuizVersion_status_idx" ON "QuizVersion"("status");

-- CreateIndex
CREATE INDEX "QuizVersion_createdAt_idx" ON "QuizVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuizNode_versionId_key_key" ON "QuizNode"("versionId", "key");

-- CreateIndex
CREATE INDEX "QuizNode_versionId_idx" ON "QuizNode"("versionId");

-- CreateIndex
CREATE INDEX "QuizNode_type_idx" ON "QuizNode"("type");

-- CreateIndex
CREATE INDEX "QuizEdge_versionId_idx" ON "QuizEdge"("versionId");

-- CreateIndex
CREATE INDEX "QuizEdge_fromNodeId_idx" ON "QuizEdge"("fromNodeId");

-- CreateIndex
CREATE INDEX "QuizEdge_toNodeId_idx" ON "QuizEdge"("toNodeId");

-- CreateIndex
CREATE INDEX "QuizResponse_leadId_idx" ON "QuizResponse"("leadId");

-- CreateIndex
CREATE INDEX "QuizResponse_versionId_idx" ON "QuizResponse"("versionId");

-- CreateIndex
CREATE INDEX "QuizResponse_nodeId_idx" ON "QuizResponse"("nodeId");

-- CreateIndex
CREATE INDEX "QuizRun_leadId_idx" ON "QuizRun"("leadId");

-- CreateIndex
CREATE INDEX "QuizRun_versionId_idx" ON "QuizRun"("versionId");

-- CreateIndex
CREATE INDEX "QuizRun_status_idx" ON "QuizRun"("status");

-- CreateIndex
CREATE INDEX "AuditLog_versionId_idx" ON "AuditLog"("versionId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

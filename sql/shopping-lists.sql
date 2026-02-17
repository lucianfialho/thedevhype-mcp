-- Shopping Lists - Lista de Compras Inteligente
-- Tables in mcp_nota_fiscal schema (camelCase columns to match existing pattern)

CREATE TABLE IF NOT EXISTS mcp_nota_fiscal.shopping_lists (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "userId" UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mcp_nota_fiscal.shopping_list_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "listId" BIGINT NOT NULL REFERENCES mcp_nota_fiscal.shopping_lists(id),
  "userId" UUID NOT NULL,
  "productId" BIGINT REFERENCES mcp_nota_fiscal.products(id),
  name TEXT NOT NULL,
  quantity NUMERIC(12, 4),
  unit TEXT,
  "estimatedPrice" NUMERIC(12, 2),
  "cheapestStore" TEXT,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_status
  ON mcp_nota_fiscal.shopping_lists("userId", status);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list
  ON mcp_nota_fiscal.shopping_list_items("listId");

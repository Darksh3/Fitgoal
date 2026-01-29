-- Create foods table
CREATE TABLE IF NOT EXISTS foods (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  calories DECIMAL(10, 2),
  protein DECIMAL(10, 2),
  carbs DECIMAL(10, 2),
  fat DECIMAL(10, 2),
  fiber DECIMAL(10, 2),
  serving_size VARCHAR(100),
  unit VARCHAR(50),
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);

-- Insert some common foods
INSERT INTO foods (name, calories, protein, carbs, fat, fiber, serving_size, unit, category) VALUES
('Frango Grelhado', 165, 31, 0, 3.6, 0, '100g', 'g', 'Proteína'),
('Arroz Branco Cozido', 130, 2.7, 28, 0.3, 0.4, '100g', 'g', 'Carboidratos'),
('Feijão Cozido', 76, 5.2, 14, 0.3, 3.7, '100g', 'g', 'Carboidratos'),
('Brócolis Cozido', 34, 2.8, 7, 0.4, 2.4, '100g', 'g', 'Vegetais'),
('Batata Doce Cozida', 86, 1.6, 20, 0.1, 3, '100g', 'g', 'Carboidratos'),
('Ovo Cozido', 155, 13, 1.1, 11, 0, '100g', 'g', 'Proteína'),
('Salmão Grelhado', 280, 25, 0, 20, 0, '100g', 'g', 'Proteína'),
('Aveia Crua', 389, 16.9, 66.3, 6.9, 10.6, '100g', 'g', 'Carboidratos'),
('Maçã', 52, 0.3, 14, 0.2, 2.4, '100g', 'g', 'Frutas'),
('Banana', 89, 1.1, 23, 0.3, 2.6, '100g', 'g', 'Frutas'),
('Pão Integral', 247, 12.3, 41.7, 3.3, 6.8, '100g', 'g', 'Carboidratos'),
('Iogurte Grego', 59, 10.2, 3.3, 0.4, 0, '100g', 'g', 'Laticínios'),
('Queijo Minas', 264, 26.1, 1.3, 17, 0, '100g', 'g', 'Laticínios'),
('Leite Desnatado', 35, 3.4, 5, 0.1, 0, '100ml', 'ml', 'Laticínios'),
('Mel', 304, 0.3, 82.4, 0, 0.2, '100g', 'g', 'Açúcares'),
('Azeite de Oliva', 884, 0, 0, 100, 0, '100ml', 'ml', 'Gorduras'),
('Almond Butter', 588, 21, 20, 50, 12, '100g', 'g', 'Gorduras'),
('Peito de Peru', 135, 29.9, 0, 1.6, 0, '100g', 'g', 'Proteína'),
('Cenoura Crua', 41, 0.9, 10, 0.2, 2.8, '100g', 'g', 'Vegetais'),
('Alface', 15, 1.4, 2.9, 0.2, 1.2, '100g', 'g', 'Vegetais')
ON CONFLICT DO NOTHING;

-- Grant public access for now (you can refine RLS later)
ALTER TABLE foods OWNER TO postgres;

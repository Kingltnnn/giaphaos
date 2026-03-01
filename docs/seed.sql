-- ==========================================
-- GIAPHA-OS SEED DATA (Họ Lê)
-- ==========================================

-- 1. Thêm các thành viên mẫu cho dòng họ Lê
-- Lưu ý: Sử dụng UUID cố định để dễ dàng tạo quan hệ trong file seed này

-- Thế hệ 1 (Cụ tổ)
INSERT INTO public.persons (id, full_name, gender, birth_year, is_deceased, generation, note)
VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Lê Văn A', 'male', 1920, true, 1, 'Cụ tổ dòng họ Lê');

-- Thế hệ 2 (Các con của cụ tổ)
INSERT INTO public.persons (id, full_name, gender, birth_year, is_deceased, generation, birth_order)
VALUES 
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Lê Văn B', 'male', 1945, false, 2, 1),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Lê Thị C', 'female', 1948, false, 2, 2);

-- Thế hệ 3 (Cháu)
INSERT INTO public.persons (id, full_name, gender, birth_year, is_deceased, generation, birth_order)
VALUES 
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Lê Tú Nam', 'male', 1985, false, 3, 1),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Lê Văn D', 'male', 1988, false, 3, 2);

-- 2. Tạo quan hệ (Relationships)
INSERT INTO public.relationships (type, person_a, person_b)
VALUES 
-- Cụ A là cha của B và C
('biological_child', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('biological_child', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'),
-- B là cha của Nam và D
('biological_child', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'),
('biological_child', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55');

-- 3. Thêm thông tin riêng tư mẫu
INSERT INTO public.person_details_private (person_id, phone_number, occupation, current_residence)
VALUES 
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', '0912345678', 'Kỹ sư phần mềm', 'Hà Nội'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '0987654321', 'Hưu trí', 'Nghệ An');

-- 4. Thêm sự kiện mẫu
INSERT INTO public.custom_events (title, event_day, event_month)
VALUES 
('Ngày giỗ Cụ Tổ Lê Văn A', 15, 3),
('Họp mặt dòng họ đầu xuân', 5, 1);

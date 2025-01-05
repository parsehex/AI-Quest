-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Player Characters policies
CREATE POLICY "Users can view their own characters"
    ON player_characters FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own characters"
    ON player_characters FOR ALL
    USING (auth.uid() = user_id);

-- Rooms policies
CREATE POLICY "Anyone can view rooms"
    ON rooms FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Public can view room players"
    ON room_players FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Only creator can update room"
    ON rooms FOR UPDATE
    USING (auth.uid() = created_by);

-- Room Players policies
CREATE POLICY "Players can join/leave rooms"
    ON room_players FOR ALL
    USING (auth.uid() = user_id);

-- Game History policies
CREATE POLICY "Room participants can view game history"
    ON game_history FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM room_players rp
        WHERE rp.room_id = game_history.room_id
        AND rp.user_id = auth.uid()
    ));

-- Chat Messages policies
CREATE POLICY "Room participants can view chat messages"
    ON chat_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM room_players rp
        WHERE rp.room_id = chat_messages.room_id
        AND rp.user_id = auth.uid()
    ));

CREATE POLICY "Room participants can send messages"
    ON chat_messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM room_players rp
        WHERE rp.room_id = chat_messages.room_id
        AND rp.user_id = auth.uid()
    ));
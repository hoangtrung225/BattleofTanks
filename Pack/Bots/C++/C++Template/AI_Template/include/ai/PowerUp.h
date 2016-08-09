#pragma once

class PowerUp
{
	friend class Game;
private:
	int m_id;
	float m_x;
	float m_y;
	int m_type;	
	bool m_active;

public:
	PowerUp();
	PowerUp(int id, float x, float y, bool active, int type);

	float GetX();
	float GetY();
	int GetType();
	bool IsActive();
};
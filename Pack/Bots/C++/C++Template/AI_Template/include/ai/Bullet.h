#pragma once

#include "defines.h"

class Bullet
{
	friend class Game;
private:
	int m_id;
	float m_x;
	float m_y;
	int m_team;
	int m_type;
	int m_direction;
	int m_speed;
	int m_damage;
	bool m_live;

public:
	Bullet();
	Bullet(int id, float x, float y, int team, int type, int dir, int speed, int damage, bool live);

	float GetX();
	float GetY();
	int GetTeam();
	int GetType();
	int GetDirection();
	int GetSpeed();
	int GetDamage();
	bool IsAlive();
};
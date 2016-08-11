// ====================================================================================
//                                  HOW TO RUN THIS
// ====================================================================================
// Call:
// "node Client.js -h [host] -p [port] -k [key] -l [logFilename]"
//
// If no argument given, it'll be 127.0.0.1:3011
// key is a secret string that authenticate the bot identity
// it is not required when testing
// ====================================================================================



// ====================================================================================
//       THE CONSTANT. YOU'RE GONNA NEED THIS. MARK THIS FOR LATER REFERENCE
// ====================================================================================
var STATE_WAITING_FOR_PLAYERS = 0;
var STATE_TANK_PLACEMENT = 1;
var STATE_ACTION = 2;
var STATE_SUDDEN_DEATH = 3;
var STATE_FINISHED = 4;

var TEAM_1 = 1;
var TEAM_2 = 2;

var MAP_W = 22;
var MAP_H = 22;

var BLOCK_GROUND = 0;
var BLOCK_WATER = 1;
var BLOCK_HARD_OBSTACLE = 2;
var BLOCK_SOFT_OBSTACLE = 3;
var BLOCK_BASE = 4;

var TANK_LIGHT = 1;
var TANK_MEDIUM = 2;
var TANK_HEAVY = 3;

var DIRECTION_UP = 1;
var DIRECTION_RIGHT = 2;
var DIRECTION_DOWN = 3;
var DIRECTION_LEFT = 4;

var NUMBER_OF_TANK = 4;

var BASE_MAIN = 1;
var BASE_SIDE = 2;


var MATCH_RESULT_NOT_FINISH = 0;
var MATCH_RESULT_TEAM_1_WIN = 1;
var MATCH_RESULT_TEAM_2_WIN = 2;
var MATCH_RESULT_DRAW = 3;
var MATCH_RESULT_BAD_DRAW = 4;

var POWERUP_AIRSTRIKE = 1;
var POWERUP_EMP = 2;

//object sizes
var TANK_SIZE = 1;
var BASE_SIZE = 2;

// ====================================================================================
//                        BEHIND THE SCENE. YOU CAN SAFELY SKIP THIS
//                  Note: Don't try to modify this. It can ruin your life.
// ====================================================================================

// =============================================
// Get the host and port from argurment
// =============================================

// Logger
var Logger;
try {
	Logger = require("./NodeWS/Logger");
}
catch (e) {
	Logger = require("./../NodeWS/Logger");
}
var logger = new Logger();

var host = "127.0.0.1";
var port = 3011;
var key = 0;

for (var i=0; i<process.argv.length; i++) {
	if (process.argv[i] == "-h") {
		host = process.argv[i + 1];
	}
	else if (process.argv[i] == "-p") {
		port = process.argv[i + 1];
	}
	else if (process.argv[i] == "-k") {
		key = process.argv[i + 1];
	}
	else if (process.argv[i] == "-l") {
		logger.startLogfile(process.argv[i + 1]);
	}
}
if (host == null) host = "127.0.0.1";
if (port == null) port = 3011;
if (key == null) key = 0;

// =============================================
// Some helping function
// =============================================
var EncodeInt8 = function (number) {
	var arr = new Int8Array(1);
	arr[0] = number;
	return String.fromCharCode(arr[0]);
};
var EncodeInt16 = function (number) {
	var arr = new Int16Array(1);
	var char = new Int8Array(arr.buffer);
	arr[0] = number;
	return String.fromCharCode(char[0], char[1]);
};
var EncodeUInt8 = function (number) {
	var arr = new Uint8Array(1);
	arr[0] = number;
	return String.fromCharCode(arr[0]);
};
var EncodeUInt16 = function (number) {
	var arr = new Uint16Array(1);
	var char = new Uint8Array(arr.buffer);
	arr[0] = number;
	return String.fromCharCode(char[0], char[1]);
};
var EncodeFloat32 = function (number) {
	var arr  = new Float32Array(1);
	var char = new Uint8Array(arr.buffer);

	arr[0] = number;
	return String.fromCharCode(char[0], char[1], char[2], char[3]);
};
var DecodeInt8 = function (string, offset) {
	var arr  = new Int8Array(1);
	var char = new Int8Array(arr.buffer);
	arr[0] = string.charCodeAt(offset);
	return char[0];
};
var DecodeInt16 = function (string, offset) {
	var arr  = new Int16Array(1);
	var char = new Int8Array(arr.buffer);

	for (var i=0; i<2; ++i) {
		char[i] = string.charCodeAt(offset + i);
	}
	return arr[0];
};
var DecodeUInt8 = function (string, offset) {
	return string.charCodeAt(offset);
};
var DecodeUInt16 = function (string, offset) {
	var arr  = new Uint16Array(1);
	var char = new Uint8Array(arr.buffer);

	for (var i=0; i<2; ++i) {
		char[i] = string.charCodeAt(offset + i);
	}
	return arr[0];
};
var DecodeFloat32 = function (string, offset) {
	var arr  = new Float32Array(1);
	var char = new Uint8Array(arr.buffer);

	for (var i=0; i<4; ++i) {
		char[i] = string.charCodeAt(offset + i);
	}
	return arr[0];
};

// =============================================
// Game objects
// =============================================
function Obstacle() {
	this.m_id = 0;
	this.m_x = 0;
	this.m_y = 0;
	this.m_HP = 0;
	this.m_destructible = false;
}
function Base () {
	this.m_id = 0;
	this.m_team = 0;
	this.m_type = 0;
	this.m_HP = 0;
	this.m_x = 0;
	this.m_y = 0;
}
function Tank() {
	this.m_id = 0;
	this.m_x = 0;
	this.m_y = 0;
	this.m_team = TEAM_1;
	this.m_type = TANK_LIGHT;
	this.m_HP = 0;
	this.m_direction = DIRECTION_UP;
	this.m_speed = 0;
	this.m_rateOfFire = 0;
	this.m_coolDown = 0;
	this.m_damage = 0;
	this.m_disabled = 0;
}
function Bullet() {
	this.m_id = 0;
	this.m_x = 0;
	this.m_y = 0;
	this.m_team = TEAM_1;
	this.m_type = TANK_MEDIUM;
	this.m_direction = DIRECTION_UP;
	this.m_speed = 0;
	this.m_damage = 0;
	this.m_live = false;
}
function Strike() {
	this.m_id = 0;
	this.m_x = 0;
	this.m_y = 0;
	this.m_team = TEAM_1;
	this.m_type = POWERUP_AIRSTRIKE;
	this.m_countDown = 0;
	this.m_live = false;
}
function PowerUp() {
	this.m_id = 0;
	this.m_active = 0;
	this.m_type = 0;
	this.m_x = 0;
	this.m_y = 0;
}
var g_team = -1;
var g_state = STATE_WAITING_FOR_PLAYERS;
var g_map = new Array();
var g_obstacles = new Array();
var g_tanks = new Array();
	g_tanks[TEAM_1] = new Array();
	g_tanks[TEAM_2] = new Array();
var g_bullets = new Array();
	g_bullets[TEAM_1] = new Array();
	g_bullets[TEAM_2] = new Array();
var g_bases = new Array();
	g_bases[TEAM_1] = new Array();
	g_bases[TEAM_2] = new Array();
var g_powerUps = new Array();
var g_strikes = new Array();
	g_strikes[TEAM_1] = new Array();
	g_strikes[TEAM_2] = new Array();

var g_matchResult;
var g_inventory = new Array();
	g_inventory[TEAM_1] = new Array();
	g_inventory[TEAM_2] = new Array();

var g_timeLeft = 0;

// =============================================
// Protocol - Sending and updating
// =============================================
var WebSocket;
try {
	WebSocket = require("./NodeWS");
}
catch (e) {
	WebSocket = require("./../NodeWS");
}

var SOCKET_IDLE = 0;
var SOCKET_CONNECTING = 1;
var SOCKET_CONNECTED = 2;

var COMMAND_PING = 0;
var COMMAND_SEND_KEY = 1;
var COMMAND_SEND_TEAM = 2;
var COMMAND_UPDATE_STATE = 3;
var COMMAND_UPDATE_MAP = 4;
var COMMAND_UPDATE_TANK = 5;
var COMMAND_UPDATE_BULLET = 6;
var COMMAND_UPDATE_OBSTACLE = 7;
var COMMAND_UPDATE_BASE = 8;
var COMMAND_REQUEST_CONTROL = 9;
var COMMAND_CONTROL_PLACE = 10;
var COMMAND_CONTROL_UPDATE = 11;
var COMMAND_UPDATE_POWERUP = 12;
var COMMAND_MATCH_RESULT = 13;
var COMMAND_UPDATE_INVENTORY = 14;
var COMMAND_UPDATE_TIME = 15;
var COMMAND_CONTROL_USE_POWERUP = 16;
var COMMAND_UPDATE_STRIKE = 17;


var socket = null;
var socketStatus = SOCKET_IDLE;


socket = WebSocket.connect ("ws://" + host + ":" + port, [], function () {
	logger.print ("Socket connected");
	socketStatus = SOCKET_CONNECTED;
	SendKey();
});
socket.on("error", function (code, reason) {
	socketStatus = SOCKET_IDLE;
	logger.print ("Socket error: " + code);
});
socket.on("text", function (data) {
	OnMessage (data);
});
socketStatus = SOCKET_CONNECTING;


function Send(data) {
	//console.log ("Socket send: " + PacketToString(data));
	socket.sendText (data);
}
function OnMessage(data) {
	// console.log ("Data received: " + PacketToString(data));

	var readOffset = 0;

	while (true) {
		var command = DecodeUInt8 (data, readOffset);
		readOffset++;

		if (command == COMMAND_SEND_TEAM) {
			g_team = DecodeUInt8 (data, readOffset); readOffset ++;
		}
		else if (command == COMMAND_UPDATE_STATE) {
			state = DecodeUInt8 (data, readOffset);
			readOffset++;

			if (g_state == STATE_WAITING_FOR_PLAYERS && state == STATE_TANK_PLACEMENT) {
				g_state = state;
				setTimeout(OnPlaceTankRequest, 100);
			}
		}
		else if (command == COMMAND_UPDATE_MAP) {
			for (var i=0; i<MAP_W; i++) {
				for (var j=0; j<MAP_H; j++) {
					g_map[j * MAP_W + i] = DecodeUInt8 (data, readOffset);
					readOffset += 1;
				}
			}
		}
		else if (command == COMMAND_UPDATE_TIME) {
			g_timeLeft = DecodeInt16 (data, readOffset); readOffset += 2;
		}
		else if (command == COMMAND_UPDATE_OBSTACLE) {
			readOffset += ProcessUpdateObstacleCommand(data, readOffset);
		}
		else if (command == COMMAND_UPDATE_TANK) {
			readOffset += ProcessUpdateTankCommand(data, readOffset);
		}
		else if (command == COMMAND_UPDATE_BULLET) {
			readOffset += ProcessUpdateBulletCommand(data, readOffset);
		}
		else if (command == COMMAND_UPDATE_BASE) {
			readOffset += ProcessUpdateBaseCommand(data, readOffset);
		}
		else if (command == COMMAND_MATCH_RESULT) {
			readOffset += ProcessMatchResultCommand(data, readOffset);
		}
		else if (command == COMMAND_UPDATE_POWERUP) {
			readOffset += ProcessUpdatePowerUpCommand(data, readOffset);
		}
		else if (command == COMMAND_UPDATE_STRIKE) {
			readOffset += ProcessUpdateStrikeCommand(data, readOffset);
		}
		else if (command == COMMAND_UPDATE_INVENTORY) {
			readOffset += ProcessUpdateInventoryCommand(data, readOffset);
		}
		else if (command == COMMAND_REQUEST_CONTROL) {
			Update();
		}
		else {
			readOffset ++;
			logger.print ("Invalid command id: " + command)
		}

		if (readOffset >= data.length) {
			break;
		}
	}
}
function SendKey() {
	if (socketStatus == SOCKET_CONNECTED) {
		var packet = "";
		packet += EncodeUInt8(COMMAND_SEND_KEY);
		packet += EncodeInt8(key);
		Send (packet);
	}
}



function ProcessUpdateObstacleCommand (data, originalOffset) {
	var offset = originalOffset;
	var id = DecodeUInt8 (data, offset); offset++;
	var x = DecodeUInt8 (data, offset); offset++;
	var y = DecodeUInt8 (data, offset); offset++;
	var HP = DecodeUInt8 (data, offset); offset++;

	if (g_obstacles[id] == null) {
		g_obstacles[id] = new Obstacle();
	}
	g_obstacles[id].m_id = id;
	g_obstacles[id].m_x = x;
	g_obstacles[id].m_y = y;
	g_obstacles[id].m_HP = HP;

	return offset - originalOffset;
}

function ProcessUpdateTankCommand (data, originalOffset) {
	var offset = originalOffset;
	var id = DecodeUInt8 (data, offset); offset++;
	var team = DecodeUInt8 (data, offset); offset++;
	var type = DecodeUInt8 (data, offset); offset++;
	var HP = DecodeUInt16 (data, offset); offset+=2;
	var dir = DecodeUInt8 (data, offset); offset++;
	var speed = DecodeFloat32 (data, offset); offset+=4;
	var ROF = DecodeUInt8 (data, offset); offset++;
	var cooldown = DecodeUInt8 (data, offset); offset++;
	var damage = DecodeUInt8 (data, offset); offset++;
	var disabled = DecodeUInt8 (data, offset); offset++;
	var x = DecodeFloat32 (data, offset); offset+=4;
	var y = DecodeFloat32 (data, offset); offset+=4;

	if (g_tanks[team][id] == null) {
		g_tanks[team][id] = new Tank();
	}
	g_tanks[team][id].m_id = id;
	g_tanks[team][id].m_team = team;
	g_tanks[team][id].m_type = type;
	g_tanks[team][id].m_HP = HP;
	g_tanks[team][id].m_direction = dir;
	g_tanks[team][id].m_speed = speed;
	g_tanks[team][id].m_rateOfFire = ROF;
	g_tanks[team][id].m_coolDown = cooldown;
	g_tanks[team][id].m_damage = damage;
	g_tanks[team][id].m_disabled = disabled;
	g_tanks[team][id].m_x = x;
	g_tanks[team][id].m_y = y;

	return offset - originalOffset;
}
function ProcessUpdateBulletCommand (data, originalOffset) {
	var offset = originalOffset;
	var id = DecodeUInt8 (data, offset); offset++;
	var live = DecodeUInt8 (data, offset); offset++;
	var team = DecodeUInt8 (data, offset); offset++;
	var type = DecodeUInt8 (data, offset); offset++;
	var dir = DecodeUInt8 (data, offset); offset++;
	var speed = DecodeFloat32 (data, offset); offset+=4;
	var damage = DecodeUInt8 (data, offset); offset++;
	var hit = DecodeUInt8 (data, offset); offset++; // not used
	var x = DecodeFloat32 (data, offset); offset+=4;
	var y = DecodeFloat32 (data, offset); offset+=4;

	if (g_bullets[team][id] == null) {
		g_bullets[team][id] = new Bullet();
	}
	g_bullets[team][id].m_id = id;
	g_bullets[team][id].m_live = live;
	g_bullets[team][id].m_team = team;
	g_bullets[team][id].m_type = type;
	g_bullets[team][id].m_dir = dir;
	g_bullets[team][id].m_speed = speed;
	g_bullets[team][id].m_damage = damage;
	g_bullets[team][id].m_x = x;
	g_bullets[team][id].m_y = y;

	return offset - originalOffset;
}

function ProcessUpdatePowerUpCommand (data, originalOffset) {
	var offset = originalOffset;
	var id = DecodeUInt8 (data, offset); offset++;
	var active = DecodeUInt8 (data, offset); offset++;
	var type = DecodeUInt8 (data, offset); offset++;
	var x = DecodeFloat32 (data, offset); offset+=4;
	var y = DecodeFloat32 (data, offset); offset+=4;

	if (g_powerUps[id] == null) {
		g_powerUps[id] = new PowerUp();
	}
	g_powerUps[id].m_id = id;
	g_powerUps[id].m_active = active;
	g_powerUps[id].m_type = type;
	g_powerUps[id].m_x = x;
	g_powerUps[id].m_y = y;

	return offset - originalOffset;
}

function ProcessUpdateBaseCommand (data, originalOffset) {
	var offset = originalOffset;
	var id = DecodeUInt8 (data, offset); offset++;
	var team = DecodeUInt8 (data, offset); offset++;
	var type = DecodeUInt8 (data, offset); offset++;
	var HP = DecodeUInt16 (data, offset); offset+=2;
	var x = DecodeFloat32 (data, offset); offset+=4;
	var y = DecodeFloat32 (data, offset); offset+=4;

	if (g_bases[team][id] == null) {
		g_bases[team][id] = new Base();
	}
	g_bases[team][id].m_id = id;
	g_bases[team][id].m_team = team;
	g_bases[team][id].m_type = type;
	g_bases[team][id].m_HP = HP;
	g_bases[team][id].m_x = x;
	g_bases[team][id].m_y = y;

	return offset - originalOffset;
}

function ProcessUpdateInventoryCommand (data, originalOffset) {
	g_inventory[TEAM_1] = new Array();
	g_inventory[TEAM_2] = new Array();

	var offset = originalOffset;
	var number1 = DecodeUInt8 (data, offset); offset++;
	for (var i=0; i<number1; i++) {
		g_inventory[TEAM_1][i] = DecodeUInt8 (data, offset); offset++;
	}
	var number2 = DecodeUInt8 (data, offset); offset++;
	for (var i=0; i<number2; i++) {
		g_inventory[TEAM_2][i] = DecodeUInt8 (data, offset); offset++;
	}

	return offset - originalOffset;
}

function ProcessUpdateStrikeCommand(data, originalOffset) {
	var offset = originalOffset;
	var id = DecodeUInt8 (data, offset); 		offset++;
	var team = DecodeUInt8 (data, offset); 		offset++;
	var type = DecodeUInt8 (data, offset); 		offset++;
	var live = DecodeUInt8 (data, offset); 		offset++;
	var countDown = DecodeUInt8 (data, offset);	offset++;
	var x = DecodeFloat32 (data, offset); 		offset+=4;
	var y = DecodeFloat32 (data, offset); 		offset+=4;

	if (g_strikes[team][id] == null) {
		g_strikes[team][id] = new Strike();
	}
	g_strikes[team][id].m_id = id;
	g_strikes[team][id].m_live = live;
	g_strikes[team][id].m_team = team;
	g_strikes[team][id].m_type = type;
	g_strikes[team][id].m_countDown = countDown;
	g_strikes[team][id].m_x = x;
	g_strikes[team][id].m_y = y;

	return offset - originalOffset;
}

function ProcessMatchResultCommand(data, originalOffset) {
	var offset = originalOffset;
	g_matchResult = DecodeUInt8 (data, offset); offset++;
	g_state = STATE_FINISHED; //update state for safety, server should also send a msg update state

	return offset - originalOffset;
}

// An object to hold the command, waiting for process
function ClientCommand() {
	var g_direction = 0;
	var g_move = false;
	var g_shoot = false;
	var g_dirty = false;
}
var clientCommands = new Array();
for (var i=0; i<NUMBER_OF_TANK; i++) {
	clientCommands.push (new ClientCommand());
}

// Pending command as a string.
var g_commandToBeSent = "";

//////////////////////////////////////////////////////////////////////////////////////
//                                                                                  //
//                                    GAME RULES                                    //
//                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////
// - TO DO: WRITE THAT SHIT HERE                                                    //
//////////////////////////////////////////////////////////////////////////////////////

// ====================================================================================
//                                       NOTE:
// ====================================================================================
// Do not modify the code above, you won't be able to 'hack',
// all data sent to server is double checked there.
// Further more, if you cause any damage to the server or
// wrong match result, you'll be disqualified right away.
//
//
//
// That's pretty much about it. Now, let's start coding.
// ====================================================================================






// ====================================================================================
// COMMAND FUNCTIONS: THESE ARE FUNCTIONS THAT HELP YOU TO CONTROL YOUR LITTLE ARMY
// ====================================================================================

// You call this function inside OnPlaceTankRequest() 4 times, to pick and place your tank.
// First param is the tank you want to use: TANK_LIGHT, TANK_MEDIUM or TANK_HEAVY.
// Then the coordinate you want to place. Must be integer.
function PlaceTank(type, x, y) {
	g_commandToBeSent += EncodeUInt8(COMMAND_CONTROL_PLACE);
	g_commandToBeSent += EncodeUInt8(type);
	g_commandToBeSent += EncodeUInt8(x >> 0);
	g_commandToBeSent += EncodeUInt8(y >> 0);
}

// You call this function inside Update(). This function will help you control your tank.
// - First parameter is the id of your tank (0 to 3), in your creation order when you placed your tank
// - Second parameter is the direction you want to turn your tank into. I can be DIRECTION_UP, DIRECTION_LEFT, DIRECTION_DOWN or DIRECTION_RIGHT.
// If you leave this param null, the tank will keep on its current direction.
// - Third parameter: True / False, whether to move your tank forward, or stay till.
// - Fourth parameter: True / False, whether to use your tank's main cannon. aka. Pew pew pew! Careful about the cooldown though.
function CommandTank (id, turn, move, shoot) {
	// Save to a list of command, and send later
	// This is to prevent player to send duplicate command.
	// Duplicate command will overwrite the previous one.
	// We just send one.
	// Turn can be null, it won't change a tank direction.
	if (turn != null) {
		clientCommands[id].m_direction = turn;
	}
	else {
		clientCommands[id].m_direction = g_tanks[g_team][id].m_direction;
	}

	clientCommands[id].m_move = move;
	clientCommands[id].m_shoot = shoot;
	clientCommands[id].m_dirty = true;
}


// You call this function to use the Airstrike powerup on a position
// Param is coordination. Can be float or integer.
// WARNING: ALL POWERUP ARE FRIENDLY-FIRE ENABLED.
// YOUR TANK OR YOUR BASE CAN BE HARM IF IT'S INSIDE THE AOE OF THE STRIKE
function UseAirstrike(x, y) {
	if (HasAirstrike()) {
		g_commandToBeSent += EncodeUInt8(COMMAND_CONTROL_USE_POWERUP);
		g_commandToBeSent += EncodeUInt8(POWERUP_AIRSTRIKE);
		g_commandToBeSent += EncodeFloat32(x);
		g_commandToBeSent += EncodeFloat32(y);
	}
}
// Same as above, but EMP instead of Airstrike.
function UseEMP(x, y) {
	if (HasEMP()) {
		g_commandToBeSent += EncodeUInt8(COMMAND_CONTROL_USE_POWERUP);
		g_commandToBeSent += EncodeUInt8(POWERUP_EMP);
		g_commandToBeSent += EncodeFloat32(x);
		g_commandToBeSent += EncodeFloat32(y);
	}
}

// This function is called at the end of the function Update or OnPlaceTankRequest.
// I've already called it for you, don't delete it.
function SendCommand () {
	// Send all pending command
	for (var i=0; i<NUMBER_OF_TANK; i++) {
		if (clientCommands[i].m_dirty == true) {
			g_commandToBeSent += EncodeUInt8(COMMAND_CONTROL_UPDATE);
			g_commandToBeSent += EncodeUInt8(i);
			g_commandToBeSent += EncodeUInt8(clientCommands[i].m_direction);
			g_commandToBeSent += EncodeUInt8(clientCommands[i].m_move);
			g_commandToBeSent += EncodeUInt8(clientCommands[i].m_shoot);

			clientCommands.m_dirty = false;
		}
	}
	Send (g_commandToBeSent);
	g_commandToBeSent = "";
}

// ====================================================================================
// HELPING FUNCTIONS: THESE ARE FUNCTIONS THAT HELP YOU RETRIEVE GAME VARIABLES
// ====================================================================================
function GetTileAt(x, y) {
	// This function return landscape type of the tile block on the map
	// It'll return the following value:
	// BLOCK_GROUND
	// BLOCK_WATER
	// BLOCK_HARD_OBSTACLE
	// BLOCK_SOFT_OBSTACLE
	// BLOCK_BASE

	return g_map[y * MAP_W + x];
}
function GetMyTeam() {
	// This function return your current team.
	// It can be either TEAM_1 or TEAM_2
	// Obviously, your opponent is the other team.
	return g_team;
}

function GetOpponentTeam() {
	if(g_team == TEAM_1)
		return TEAM_2;
	else
		return TEAM_1;
}

function GetMyTank(id) {
	// Return your tank, just give the id.
	return g_tanks[g_team][id];
}

function GetEnemyTank(id) {
	// Return enemy tank, just give the id.
	return g_tanks[(TEAM_1 + TEAM_2) - g_team][id];
}

function GetPowerUpList() {
	// Return active powerup list
	var powerUp = [];
	for (var i=0; i<g_powerUps.length; i++) {
		if (g_powerUps[i].m_active) {
			powerUp.push (g_powerUps[i]);
		}
	}

	return powerUp;
}

function HasAirstrike() {
	// Call this function to see if you have airstrike powerup.
	for (var i=0; i<g_inventory[g_team].length; i++) {
		if (g_inventory[g_team][i] == POWERUP_AIRSTRIKE) {
			return true;
		}
	}
	return false;
}

function HasEMP() {
	// Call this function to see if you have EMP powerup.
	for (var i=0; i<g_inventory[g_team].length; i++) {
		if (g_inventory[g_team][i] == POWERUP_EMP) {
			return true;
		}
	}
	return false;
}

function GetIncomingStrike() {
	var incoming = [];

	for (var i=0; i<g_strikes[TEAM_1].length; i++) {
		if (g_strikes[TEAM_1][i].m_live) {
			incoming.push (g_strikes[TEAM_1][i]);
		}
	}
	for (var i=0; i<g_strikes[TEAM_2].length; i++) {
		if (g_strikes[TEAM_2][i].m_live) {
			incoming.push (g_strikes[TEAM_2][i]);
		}
	}

	return incoming;
}

// ====================================================================================
// YOUR FUNCTIONS. YOU IMPLEMENT YOUR STUFF HERE.
// ====================================================================================
function OnPlaceTankRequest() {
	// This function is called at the start of the game. You place your tank according
	// to your strategy here.
	if (GetMyTeam() == TEAM_1) {
		PlaceTank(TANK_HEAVY, 1, 1);
		PlaceTank(TANK_HEAVY, 3, 8);
		PlaceTank(TANK_HEAVY, 6, 10);
		PlaceTank(TANK_HEAVY, 1, 20);
	}
	else if (GetMyTeam() == TEAM_2) {
		PlaceTank(TANK_HEAVY, 16, 4);
		PlaceTank(TANK_HEAVY, 17, 6);
		PlaceTank(TANK_HEAVY, 17, 15);
		PlaceTank(TANK_HEAVY, 20, 20);
	}

	// Leave this here, don't remove it.
	// This command will send all of your tank command to server
	SendCommand();
}







// MY function
//===========================================================================================================
function GetTankDirection (tankid) {
  var ReturnDirections = [];
	var TANK = GetMyTank(tankid);
  if (GetTileAt(Math.floor(TANK.m_x - 1), Math.floor(TANK.m_y)) == BLOCK_GROUND ) ReturnDirections.push(DIRECTION_LEFT);
  if (GetTileAt(Math.floor(TANK.m_x), Math.floor(TANK.m_y-1)) == BLOCK_GROUND ) ReturnDirections.push(DIRECTION_UP);
  if (GetTileAt(Math.floor(TANK.m_x+1), Math.floor(TANK.m_y)) == BLOCK_GROUND ) ReturnDirections.push(DIRECTION_RIGHT);
  if (GetTileAt(Math.floor(TANK.m_x), Math.floor(TANK.m_y+1)) == BLOCK_GROUND ) ReturnDirections.push(DIRECTION_DOWN);
  return ReturnDirections;
}


function TagetTanks (TANK) {
	var TagetTankReturn = [];
  for (var i = 0; i < NUMBER_OF_TANK; i++){
    var TempTaget = GetEnemyTank(i);
    if (TempTaget == null || TempTaget.m_HP == 0)
      continue;
    if ((TempTaget.m_x-1 < TANK.m_x && TANK.m_x < TempTaget.m_x+1 ) || (TempTaget.m_y-1 < TANK.m_y && TANK.m_y <TempTaget.m_y+1))
      TagetTankReturn.push(TempTaget);
  }
  return TagetTankReturn;
}


var UP_DOWN = 0;
var LEFT_RIGHT = 1;
function ClearShot(Source_x, Source_y, Destine_x, Destine_y ){
	var FlooredGetTile;
	if (Source_x - 1 < Destine_x && Destine_x < Source_x + 1){
		if (Source_y < Destine_y){
			for(var y = Source_y; y < Destine_y; y++){
				FlooredGetTile = GetTileAt(Math.floor(Source_x), Math.floor(y));
				if ((FlooredGetTile == BLOCK_HARD_OBSTACLE) || (FlooredGetTile == BLOCK_BASE) || (FlooredGetTile == BLOCK_SOFT_OBSTACLE))
					return Source_x, y, UP_DOWN;
			}
			return UP_DOWN;
		}
		else {
			for(var y = Destine_y; y < Source_y; y++){
				FlooredGetTile = GetTileAt(Math.floor(Source_x), Math.floor(y));
				if ((FlooredGetTile == BLOCK_HARD_OBSTACLE) || (FlooredGetTile == BLOCK_BASE) || (FlooredGetTile == BLOCK_SOFT_OBSTACLE))
					return Source_x, y, UP_DOWN;
			}
			return UP_DOWN;
		}
	}
	if (Source_y - 1 < Destine_y && Destine_y < Source_y + 1){
		if (Source_x < Destine_x){
			for(var x = Source_x; x < Destine_x; x++){
				console.log("gettileat"+ "x" +x+ "y"+Source_y+"title"+FlooredGetTile);
				FlooredGetTile = GetTileAt(Math.floor(x), Math.floor(Source_y));
				if ((FlooredGetTile == BLOCK_HARD_OBSTACLE) || (FlooredGetTile == BLOCK_BASE) || (FlooredGetTile == BLOCK_SOFT_OBSTACLE))
					return x, Source_y, LEFT_RIGHT;
			}
			return LEFT_RIGHT
		}
		else {
			for(var x = Destine_x; x < Source_x; x++){
				FlooredGetTile = GetTileAt(Math.floor(x), Math.floor(Source_y));
				if ((FlooredGetTile == BLOCK_HARD_OBSTACLE || FlooredGetTile == BLOCK_BASE) || (FlooredGetTile == BLOCK_SOFT_OBSTACLE))
					return x, Source_y, LEFT_RIGHT;
			}
			return LEFT_RIGHT;
		}
	}
}


function TankMarch(){
  if (GetMyTeam() == TEAM_1)
    return DIRECTION_RIGHT;
  else if (GetMyTeam() == TEAM_2)
    return DIRECTION_LEFT
  }



function Navigate(Current_x, Current_y, Taget_x, Taget_y){
  ReturnDirection = {}
  if (Current_x < Taget_x) ReturnDirection[LEFT_RIGHT] = DIRECTION_RIGHT;
  else ReturnDirection[LEFT_RIGHT] = DIRECTION_LEFT;
  if (Current_y < Taget_y) ReturnDirection[UP_DOWN] = DIRECTION_DOWN;
  else ReturnDirection[UP_DOWN] = DIRECTION_UP;
  return ReturnDirection;
}

function Opposite(DIRECTION){
	if (DIRECTION == DIRECTION_UP) return DIRECTION_DOWN;
	if (DIRECTION == DIRECTION_DOWN) return DIRECTION_UP;
	if (DIRECTION == DIRECTION_LEFT) return DIRECTION_RIGHT;
	if (DIRECTION == DIRECTION_RIGHT) return DIRECTION_LEFT;
}
//format (m-x, m_y,HP)
var HISTORY = {};
function IsStucking(){
	var returnstuck = {};
	returnstuck["MyStuckTanks"] = [];
	returnstuck["EnemyStuckTanks"] = [];
	if (isEmpty(HISTORY)){
		for(var i = 0; i < 4; i++){
			HISTORY["MyTank" +i] = [];
			HISTORY["EnemyTank" +i] =[];
			for(var j = 0; j < 5; j++){
				HISTORY["MyTank" +i].push([0, 0, 0]);
				HISTORY["EnemyTank" +i].push([0, 0, 0]);
			}
		}
	}
	else{
		for(var i = 0; i < 4; i++){
			HISTORY["MyTank" +i].splice(0, 1);
			HISTORY["MyTank" +i].push([GetMyTank(i).m_x, GetMyTank(i).m_y, GetMyTank(i).m_HP]);
			if(Math.abs(HISTORY["MyTank" +i][4][0]) - Math.abs(HISTORY["MyTank" +i][0][0]) < 0.2 && Math.abs(HISTORY["MyTank" +i][4][1]) - Math.abs(HISTORY["MyTank" +i][0][1]) < 0.2
			&& Math.abs(HISTORY["MyTank" +i][4][2]) - Math.abs(HISTORY["MyTank" +i][0][2]) == 0)
				if(GetMyTank(i).m_HP > 0) returnstuck["MyStuckTanks"].push(i);
			HISTORY["EnemyTank" +i].splice(0, 1);
			HISTORY["EnemyTank" +i].push([GetEnemyTank(i).m_x, GetEnemyTank(i).m_y, GetEnemyTank(i).m_HP]);
			if(Math.abs(HISTORY["EnemyTank" +i][4][0]) - Math.abs(HISTORY["EnemyTank" +i][0][0]) < 0.2 && Math.abs(HISTORY["EnemyTank" +i][4][1]) - Math.abs(HISTORY["EnemyTank" +i][0][1]) < 0.2
			&& Math.abs(HISTORY["EnemyTank" +i][4][2]) - Math.abs(HISTORY["EnemyTank" +i][0][2]) == 0)
				if(GetEnemyTank(i).m_HP > 0) returnstuck["EnemyStuckTanks"].push(i);
		}
	}
	return returnstuck;
}


// helper function
function isEmpty(obj) {
  for(var i in obj) { return false; }
  return true;
}


function InArray(Element, Array){
	for( x in Array){
		if (Array[x] == Element) return true;
	}
	return false;
}




//notice to argument must be floored
// function TileToTile(SourceTileX, SourceTileY, DestineTileX, DestineTileY){
// 	var TileLevel ={};
// 	var PreviousTile = {}
//
//
// }

function SeekDestroy(MyTankIndex){
	var tempTank = GetMyTank(MyTankIndex);
	var tempEnemyTank;
	var ReturnMove = {};
	var direction;
	ReturnMove[DIRECTION_UP] = 0;
	ReturnMove[DIRECTION_DOWN] = 0;
	ReturnMove[DIRECTION_LEFT] = 0;
	ReturnMove[DIRECTION_RIGHT] = 0;
	for(var i = 0; i < 4; i++){
		tempEnemyTank = GetEnemyTank(i);
		if((tempEnemyTank == null) ||(tempEnemyTank.m_HP == 0))
			continue;
		if(Navigate(tempTank.m_x, tempTank.m_y, tempEnemyTank.m_x, tempEnemyTank.m_y)[UP_DOWN] == DIRECTION_UP)
			ReturnMove[DIRECTION_UP]++;
		if(Navigate(tempTank.m_x, tempTank.m_y, tempEnemyTank.m_x, tempEnemyTank.m_y)[UP_DOWN] == DIRECTION_DOWN)
			ReturnMove[DIRECTION_DOWN]++;
		if(Navigate(tempTank.m_x, tempTank.m_y, tempEnemyTank.m_x, tempEnemyTank.m_y)[LEFT_RIGHT] == DIRECTION_LEFT)
			ReturnMove[DIRECTION_LEFT]++;
		if(Navigate(tempTank.m_x, tempTank.m_y, tempEnemyTank.m_x, tempEnemyTank.m_y)[LEFT_RIGHT] == DIRECTION_RIGHT)
			ReturnMove[DIRECTION_RIGHT]++;
		}
		var PowerUp = GetPowerUpList();
		for(var i = 0;i < PowerUp.length; i++){
			if(Navigate(tempTank.m_x, tempTank.m_y, PowerUp.m_x, PowerUp.m_y)[UP_DOWN] == DIRECTION_UP)
				ReturnMove[DIRECTION_UP]++;
			if(Navigate(tempTank.m_x, tempTank.m_y, PowerUp.m_x, PowerUp.m_y)[UP_DOWN] == DIRECTION_DOWN)
				ReturnMove[DIRECTION_DOWN]++;
			if(Navigate(tempTank.m_x, tempTank.m_y, PowerUp.m_x, PowerUp.m_y)[LEFT_RIGHT] == DIRECTION_LEFT)
				ReturnMove[DIRECTION_LEFT]++;
			if(Navigate(tempTank.m_x, tempTank.m_y, PowerUp.m_x, PowerUp.m_y)[LEFT_RIGHT] == DIRECTION_RIGHT)
				ReturnMove[DIRECTION_RIGHT]++;
		}
		var returnarray = [];
			for(i in ReturnMove)
			{
				if(ReturnMove[i] > 0)
				{
					returnarray.push(i);
				}
			}
		return returnarray;

}

function FoundCommon(array1, array2){
	var arrayreturn = [];
	for (var i = 0; i < array1.length; i++){
		for( var j = 0; j < array2.length; j++){
			if (array1[i] == array2[j]) arrayreturn.push(array1[i]);
		}
	}
	return arrayreturn;
}

function VerboseDirection(DirectionId){
	if(DirectionId == 1) return "DIRECTION_UP";
	if(DirectionId == 2) return "DIRECTION_RIGHT";
	if(DirectionId == 3) return "DIRECTION_DOWN";
	if(DirectionId == 4) return "DIRECTION_LEFT";
}



function LockOn (MyTankId){

	var returncommand ={};
	returncommand["direction"] =  TankMarch();
	returncommand["shot"] = false;
	var tempTank = GetMyTank(MyTankId);
	// Don't waste effort if tank was dead


	var enemytank;
		for(var j=0; j < TagetTanks(tempTank).length; j++)
		{
			console.log("Tank " + MyTankId  + " In LOCK on Enemy Tank" + j);
			enemytank = TagetTanks(tempTank)[j];
			var IsClearShot = ClearShot(tempTank.m_x, tempTank.m_y, enemytank.m_x, enemytank.m_y);

			if ( IsClearShot != UP_DOWN && IsClearShot != LEFT_RIGHT){
				if( j == TagetTanks(tempTank).length -1){
					// fix code here plzzzzz
					direction = Opposite()
					console.log("taget the last enemy tank not on sigh" + IsClearShot);
					// if (!InArray(returncommand["direction"]), GetTankDirection(MyTankId))
					// returncommand["direction"] = Opposite(Navigate(tempTank.m_x, tempTank.m_y, IsClearShot[0], IsClearShot[1])[LEFT_RIGHT]);

				}
				continue;
			 }
			else if (IsClearShot == UP_DOWN) {
				if (tempTank.m_coolDown == 0){
					returncommand["direction"] = Navigate(tempTank.m_x, tempTank.m_y, enemytank.m_x, enemytank.m_y)[UP_DOWN];
					returncommand["shot"] = true;
					break;
				}
				if (tempTank.m_coolDown > 0) {
					returncommand["direction"] = Navigate(tempTank.m_x, tempTank.m_y, enemytank.m_x, enemytank.m_y)[LEFT_RIGHT];
					if(enemytank.m_disabled == true ||enemytank.m_coolDown > 0 &&
						(enemytank.m_direction != Opposite(Navigate(tempTank.m_x, tempTank.m_y, enemytank.m_x, enemytank.m_y)[UP_DOWN])))
					{
						console.log("It is EMP go for the kill");
						returncommand["shot"] = false;
						break;
					}
					else {
						returncommand["direction"] = Opposite(returncommand["direction"]);
						returncommand["shot"] = false;
						break;
					}

				}
			}
			else if (IsClearShot == LEFT_RIGHT) {
				if (tempTank.m_coolDown ==0){
					returncommand["direction"] = Navigate(tempTank.m_x, tempTank.m_y, enemytank.m_x, enemytank.m_y)[LEFT_RIGHT];
					returncommand["shot"] = true;
					console.log("tank " + i+"shutting at Left_Right" + IsClearShot);
					break;
				}
				if (tempTank.m_coolDown >0){
					returncommand["direction"] = Navigate(tempTank.m_x, tempTank.m_y, enemytank.m_x, enemytank.m_y)[UP_DOWN];
					if(enemytank.m_disabled == true ||(enemytank.m_coolDown > 0 && enemytank.m_direction != Opposite(Navigate(tempTank.m_x, tempTank.m_y, enemytank.m_x, enemytank.m_y)[LEFT_RIGHT])))
					{
						returncommand["shot"] = false;
						break;
					}
					else {
						returncommand["direction"] = Opposite(returncommand["direction"]);
						returncommand["shot"] = false;
						break;
					}
				}
			}

		 }
	console.log("direction "+ returncommand["direction"] + " shot " + returncommand["shot"]);
	return returncommand;
}

function GetMyBases(id){
	return g_bases[g_team][id];
}

function GetEnemyBases(id){
	return g_bases[TEAM_1+ TEAM_2 - g_team][id];
}

function StuckSolution(TankId){
	var direction = GetMyTank(TankId).m_direction;
	if(InArray(TankId, IsStucking()["MyStuckTanks"])){

		console.log("tank i stuck in "+ IsStucking()["MyStuckTanks"]);
		if (!InArray(direction, GetTankDirection(TankId)))
		{
			console.log("Tank " +TankId+ " exit way is block before getrandom direction" + VerboseDirection(direction));
			direction = GetTankDirection(TankId)[Math.floor((Math.random() * 3))];
		}
		else{
			direction = FoundCommon(SeekDestroy(TankId), GetTankDirection(TankId))[Math.floor((Math.random() * 3))];
			console.log("found random direction in Stuck");
		}

	}
	return direction;
}
//===========================================================================================================








function Update() {
  // =========================================================================================================
	// Do nothing if the match is ended
	// You should keep this. Removing it probably won't affect much, but just keep it.
	// =========================================================================================================
	if(g_state == STATE_FINISHED) {
		if(((g_matchResult == MATCH_RESULT_TEAM_1_WIN) && (GetMyTeam() == TEAM_1)) || ((g_matchResult == MATCH_RESULT_TEAM_2_WIN) && (GetMyTeam() == TEAM_2))) {
			console.log("I WON. I WON. I'M THE BEST!!!");
		}
		else if(((g_matchResult == MATCH_RESULT_TEAM_2_WIN) && (GetMyTeam() == TEAM_1)) || ((g_matchResult == MATCH_RESULT_TEAM_1_WIN) && (GetMyTeam() == TEAM_2))) {
			console.log("DAMN, I LOST. THAT GUY WAS JUST LUCKY!!!");
		}
		else {
			console.log("DRAW.. BORING!");
		}
		return;
	}








	// =========================================================================================================
	// Check if there will be any airstrike or EMP
	// The GetIncomingStrike() function will return an array of strike object. Both called by your team
	// or enemy team.
	// =========================================================================================================
	var strike = GetIncomingStrike();
	for (var i=0; i<strike.length; i++) {
		var x = strike[i].m_x;
		var y = strike[i].m_y;
		var count = strike[i].m_countDown; // Delay (in server loop) before the strike reach the battlefield.
		var type = strike[i].m_type;

		if (type == POWERUP_AIRSTRIKE) {
			// You may want to do something here, like moving your tank away if the strike is on top of your tank.
		}
		else if (type == POWERUP_EMP) {
			// Run... RUN!!!!
		}
	}





	// =========================================================================================================
	// Get power up list on the map. You may want to move your tank there and secure it before your enemy
	// does it. You can get coordination, and type from this object
	// =========================================================================================================
	var powerUp = GetPowerUpList();
	for (var i=0; i<powerUp.length; i++) {
		var x = powerUp[i].m_x;
		var y = powerUp[i].m_y;
		var type = powerUp[i].m_type;
		if (type == POWERUP_AIRSTRIKE) {
			// You may want to move your tank to this position to secure this power up.
		}
		else if (type == POWERUP_EMP) {

		}
	}


	// =========================================================================================================
	// This is an example on how you command your tanks.
	// In this example, I go through all of my "still intact" tanks, and give them random commands.
	// =========================================================================================================
	// Loop through all tank (if not dead yet)
	for (var i=0; i<NUMBER_OF_TANK; i++) {
		var tempTank = GetMyTank(i);
		if((tempTank == null) ||(tempTank.m_HP == 0))
			continue;

		var direction = tempTank.m_direction;
		var shot = false;


		if (TagetTanks(tempTank).length != 0)
		{
			var lockoncall = LockOn(i);
			console.log("calling Lock ON" + lockoncall["direction"] + lockoncall["shot"]);
			direction = lockoncall["direction"];
			shot = lockoncall["shot"];
		}
		else {
			// if(InArray(i, IsStucking()["MyStuckTanks"])){
			// direction = StuckSolution(i);
			// }
			// else
			if (Math.random() > 0.9){
				direction = FoundCommon(SeekDestroy(i), GetTankDirection(i))[Math.floor((Math.random() * 3))];
				shot = false;
				console.log("Tank "+ i +" go random" +VerboseDirection(direction));
				console.log("seek destroy: " + SeekDestroy(i) + " Get direction " +GetTankDirection(i)) ;
			}
			else {
				{
					console.log("Tank "+ i+" go forth");
					direction = tempTank.m_direction;
					shot = false;
				}
			}
		}

		console.log("tank "+i+" final destination"+ VerboseDirection(direction));
		// console.log("my current potision x: "+tempTank.m_x + " y: " + tempTank.m_y);
		CommandTank(i, direction, true, shot);
}




	// =========================================================================================================
	// This is an example on how you use your power up if you acquire one.
	// If you have airstrike or EMP, you may use them anytime.
	// I just give a primitive example here: I strike on the first enemy tank, as soon as I acquire power up
	// =========================================================================================================
	if (HasAirstrike()) {
		for (var i=0; i<NUMBER_OF_TANK; i++) {
			if (GetEnemyTank(i).m_HP > 0) {
				UseAirstrike (GetEnemyTank(i).m_x, GetEnemyTank(i).m_y); // BAM!!!
				break;
			}
		}
	}
	if (HasEMP()) {
		for (var i=0; i<NUMBER_OF_TANK; i++) {
			if (GetEnemyTank(i).m_HP > 0) {
				UseEMP (GetEnemyTank(i).m_x, GetEnemyTank(i).m_y);
				break;
			}
		}
	}


	// Leave this here, don't remove it.
	// This command will send all of your tank command to server
	SendCommand();
}

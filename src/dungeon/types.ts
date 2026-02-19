export enum TileType {
  Empty = 0,
  Floor = 1,
  Wall = 2,
  Door = 3,
  Exit = 4,
  Entrance = 5,
}

export enum ObstacleType {
  None = 0,
  Furniture = 1,  // Solid object, blocks movement
  Water = 2,      // Weakens player/enemy on contact (reduced damage)
  Mud = 3,        // Slows player/enemy on contact
  Fire = 4,       // Burns player/enemy on contact (periodic damage)
  Trap = 5,       // Explodes on contact (one-time burst damage)
}

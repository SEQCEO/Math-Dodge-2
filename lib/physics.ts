interface Circle {
  x: number;
  y: number;
  radius: number;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function circleIntersectsRect(circle: Circle, rect: Rectangle): boolean {
  // Find the closest point on the rectangle to the circle's center
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  
  // Calculate the distance between the circle's center and this closest point
  const distanceX = circle.x - closestX;
  const distanceY = circle.y - closestY;
  
  // If the distance is less than the circle's radius, an intersection occurs
  const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
  return distanceSquared < (circle.radius * circle.radius);
}
import type { FloorModel, LayerNode } from '@/types/domain'
import { LayerType } from '@/types/domain'

const ROOMS_COLLECTION_ID = 'collection_rooms'
const UNASSIGNED_COLLECTION_ID = 'collection_unassigned_furniture'

export function buildLayerTree(floor: FloorModel): LayerNode {
  const floorNode: LayerNode = {
    id: floor.id,
    name: floor.name,
    type: LayerType.Floor,
    parentId: null,
    visible: true,
    locked: false,
    children: [],
  }

  if (floor.planImage) {
    floorNode.children.push({
      id: floor.planImage.id,
      name: floor.planImage.name,
      type: LayerType.PlanImage,
      parentId: floor.id,
      visible: floor.planImage.visible,
      locked: floor.planImage.locked,
      children: [],
    })
  }

  const roomsNode: LayerNode = {
    id: ROOMS_COLLECTION_ID,
    name: 'Rooms',
    type: LayerType.Collection,
    parentId: floor.id,
    visible: true,
    locked: false,
    children: [],
  }

  const roomNodeById = new Map<string, LayerNode>()
  for (const room of floor.rooms) {
    const roomNode: LayerNode = {
      id: room.id,
      name: room.name,
      type: LayerType.Room,
      parentId: ROOMS_COLLECTION_ID,
      visible: room.visible,
      locked: room.locked,
      children: [],
    }

    roomsNode.children.push(roomNode)
    roomNodeById.set(room.id, roomNode)
  }

  const unassignedFurnitureNode: LayerNode = {
    id: UNASSIGNED_COLLECTION_ID,
    name: 'Unassigned Furniture',
    type: LayerType.Collection,
    parentId: ROOMS_COLLECTION_ID,
    visible: true,
    locked: false,
    children: [],
  }

  for (const furniture of floor.furnitures) {
    const furnitureNode: LayerNode = {
      id: furniture.id,
      name: furniture.label,
      type: LayerType.Furniture,
      parentId: furniture.roomId,
      visible: furniture.visible,
      locked: furniture.locked,
      children: [],
    }

    if (furniture.roomId && roomNodeById.has(furniture.roomId)) {
      const roomNode = roomNodeById.get(furniture.roomId)
      if (roomNode) {
        roomNode.children.push(furnitureNode)
      }
      continue
    }

    unassignedFurnitureNode.children.push(furnitureNode)
  }

  if (unassignedFurnitureNode.children.length > 0) {
    roomsNode.children.push(unassignedFurnitureNode)
  }

  floorNode.children.push(roomsNode)
  return floorNode
}

export function flattenLayerTree(rootNode: LayerNode): LayerNode[] {
  const orderedNodes: LayerNode[] = []
  const walk = (node: LayerNode): void => {
    orderedNodes.push(node)
    for (const childNode of node.children) {
      walk(childNode)
    }
  }

  walk(rootNode)
  return orderedNodes
}

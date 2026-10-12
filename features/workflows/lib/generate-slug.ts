const adjectives = ["brave", "bright", "calm", "clever", "gentle", "happy", "jolly", "keen", "swift", "wise"]
const animals = ["badger", "bear", "falcon", "fox", "koala", "otter", "panda", "tiger", "whale", "wolf"]

export function generateSlug() {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const animal = animals[Math.floor(Math.random() * animals.length)]

  return `${adjective}-${animal}`
}
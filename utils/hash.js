function generateHash(name, dob, email) {
  const str = name + dob + email;

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 1e16;
  }

  return hash.toString(36).padStart(16, "0").slice(0, 16);
}

module.exports = generateHash;
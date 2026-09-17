import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import User from '../models/user.model.js';
import { ServiceError } from '../errors/service.error.js';

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

/**
 * Registra un nuevo usuario.
 */
async function register({ name, email, password }) {
  const existing = await User.findOne({
    email: email.toLowerCase(),
  }).lean();

  if (existing) {
    throw new ServiceError(
      'Ya existe una cuenta con ese email',
      409
    );
  }

  const hashedPassword = await bcrypt.hash(
    password,
    SALT_ROUNDS
  );

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  const token = signToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Login.
 */
async function login({ email, password }) {
  const user = await User.findOne({
    email: email.toLowerCase(),
  }).select('+password');

  if (!user || !user.isActive) {
    throw new ServiceError(
      'Credenciales incorrectas',
      401
    );
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordMatches) {
    throw new ServiceError(
      'Credenciales incorrectas',
      401
    );
  }

  const token = signToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Devuelve el perfil del usuario autenticado.
 */
async function getProfile(userId) {
  const user = await User.findById(userId).lean();

  if (!user) {
    throw new ServiceError(
      'Usuario no encontrado',
      404
    );
  }

  return user;
}

/**
 * Actualiza nombre y/o email del usuario autenticado.
 * Si cambia el email, comprueba que no lo tenga ya otro usuario (409).
 */
async function updateProfile(userId, { name, email }) {
  const updates = {};
  if (name !== undefined) updates.name = name;

  if (email !== undefined) {
    const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } }).lean();
    if (existing) {
      throw new ServiceError('Ya existe una cuenta con ese email', 409);
    }
    updates.email = email;
  }

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  }).lean();

  if (!user) {
    throw new ServiceError('Usuario no encontrado', 404);
  }

  return user;
}

/**
 * Cambia la contraseña del usuario autenticado, verificando primero la
 * contraseña actual — así una sesión robada no basta para tomar la cuenta
 * por completo cambiando la contraseña sin más.
 */
async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ServiceError('Usuario no encontrado', 404);
  }

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) {
    throw new ServiceError('La contraseña actual no es correcta', 401);
  }

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  return { updated: true };
}


export default {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
};
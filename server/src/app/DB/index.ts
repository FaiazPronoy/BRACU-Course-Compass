import config from '../config';
import User from '../modules/User/User.model';

const seedSuperAdmin = async () => {
  const email = config.super_admin_email;
  const password = config.super_admin_password;

  if (!email || !password) {
    console.log('SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set, skipping admin seed');
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) return;

  await User.create({ name: 'Portal Admin', email, password, role: 'admin' });
  console.log(`Created admin account: ${email}`);
};

export default seedSuperAdmin;

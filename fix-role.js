// Script simple para actualizar el rol del usuario
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/fixturepro'
});

async function fixUserRole() {
  try {
    console.log('🔧 Actualizando rol del usuario...');
    
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE email = $2',
      ['vocal', 'darwin.sinche@gmail.com']
    );
    
    console.log('✅ Rol actualizado exitosamente');
    console.log('📧 Email: darwin.sinche@gmail.com');
    console.log('🔄 Rol anterior: visitante');
    console.log('✅ Rol nuevo: vocal');
    
    // Verificar el cambio
    const user = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      ['darwin.sinche@gmail.com']
    );
    
    console.log('🔍 Verificación:');
    console.log('   ID:', user.rows[0]?.id);
    console.log('   Email:', user.rows[0]?.email);
    console.log('   Rol:', user.rows[0]?.role);
    
  } catch (error) {
    console.error('❌ Error al actualizar rol:', error);
  } finally {
    await pool.end();
  }
}

fixUserRole();

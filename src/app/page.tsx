
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role;

  if (role === 'STORE_MANAGER') {
    redirect('/inventory');
  } else if (role === 'CASHIER') {
    redirect('/cashier');
  } else if (role === 'CHEF') {
    redirect('/kitchen');
  } else if (role === 'CAPTAIN') {
    redirect('/captain');
  } else if (role === 'WAITER') {
    redirect('/waiter');
  } else if (role === 'DRIVER' || role === 'DELIVERY_MANAGER') {
    redirect('/delivery');
  } else {
    redirect('/dashboard');
  }
}

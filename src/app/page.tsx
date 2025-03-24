'use client'
import { useRouter } from 'next/navigation';
import { Button } from 'react-vant';

export default function Home() {
  const router = useRouter();

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center">
        
        <Button 
          type="primary" 
          size="large"
          block
          className="max-w-xs"
          onClick={() => router.push('/login')}
        >
          开始使用
        </Button>
      </main>
    </div>
  );
}

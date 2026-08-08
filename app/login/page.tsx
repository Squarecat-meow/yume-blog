'use client';

import Button from '@/components/button';
import Input from '@/components/input';
import Image from 'next/image';
import { Controller, useForm } from 'react-hook-form';

type FormValue = {
  id: string;
  password: string;
};

export default function Login() {
  const { handleSubmit, control } = useForm<FormValue>();

  const onSubmit = (e: FormValue) => {
    console.log(e);
  };

  return (
    <section className="flex-1 flex flex-col items-center justify-center py-2">
      <section className="w-1/2 grid grid-cols-2 border border-slate-400 rounded-lg shadow-lg">
        <article>
          <Image
            src={'/assets/login-image.jpg'}
            alt="login side image"
            width={3649}
            height={5444}
            quality={70}
            className="aspect-square object-cover rounded-l-lg"
          />
        </article>
        <article className="p-4 flex flex-col justify-center items-center">
          <h1 className="font-song text-3xl mb-4">로그인</h1>
          <form
            className="w-2/3 flex flex-col gap-2"
            onSubmit={handleSubmit(onSubmit)}
          >
            <Controller
              control={control}
              name="id"
              render={({ field: { onChange, value } }) => (
                <Input
                  type="text"
                  placeholder="아이디"
                  onChange={onChange}
                  defaultValue={value}
                  autoComplete="off"
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  type="password"
                  placeholder="비밀번호"
                  onChange={onChange}
                  defaultValue={value}
                />
              )}
            />
            <Button text="로그인" type="submit" />
          </form>
        </article>
      </section>
    </section>
  );
}

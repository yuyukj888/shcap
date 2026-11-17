import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import PageLoading from '@/components/page_loading';
import SaveButtons from '@/components/button/save_buttons';
import SwitchCard from '@/components/switch_card';

import MailManager from '@/controllers/mail_manager';
import type { MailConfigData } from '@/controllers/mail_manager';

const MailConfigCard = () => {
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    setValue,
    getValues,
  } = useForm<MailConfigData>({
    defaultValues: {
      enable: false,
      host: '',
      port: 465,
      secure: true,
      user: '',
      pass: '',
      from: '',
      to: '',
      notifyOffline: true,
      notifyRecover: true,
      cooldownMinutes: 10,
    },
  });

  const loadConfig = async (showTip = false) => {
    try {
      setLoading(true);
      const data = await MailManager.getConfig();
      const cfg = data.config;
      (Object.keys(cfg) as Array<keyof MailConfigData>).forEach((k) => {
        setValue(k as never, cfg[k] as never);
      });
      if (showTip) toast.success('已刷新');
    } catch (error) {
      toast.error(`获取邮件配置失败: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload: Partial<MailConfigData> = { ...data, port: Number(data.port) || 465 };
      const saved = await MailManager.saveConfig(payload);
      if (saved.config.pass) setValue('pass', saved.config.pass);
      toast.success('邮件配置已保存');
    } catch (error) {
      toast.error(`保存失败: ${(error as Error).message}`);
    }
  });

  const onTest = async () => {
    const to = (getValues('to') ?? '').trim();
    if (!to) {
      toast.error('请先填写收件人');
      return;
    }
    try {
      setTesting(true);
      const res = await MailManager.test(to);
      if (res.success) {
        toast.success('测试邮件已发送，请查收');
      } else {
        toast.error(`发送失败: ${res.message}`);
      }
    } catch (error) {
      toast.error(`发送失败: ${(error as Error).message}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <>
      <div className='flex flex-col gap-4'>
        <Controller
          control={control}
          name='enable'
          render={({ field }) => (
            <SwitchCard
              {...field}
              value={field.value}
              onValueChange={field.onChange}
              label='启用邮件服务'
              description='开启后由 SHCAP 在 QQ 掉线 / 恢复上线时发送提醒邮件'
            />
          )}
        />
        <Controller
          control={control}
          name='host'
          render={({ field }) => (
            <Input {...field} label='SMTP 服务器' placeholder='smtp.qq.com' description='例如 smtp.qq.com / smtp.163.com / smtp.gmail.com' />
          )}
        />
        <div className='flex flex-col gap-4 md:flex-row'>
          <Controller
            control={control}
            name='port'
            render={({ field }) => (
              <Input
                {...field}
                value={String(field.value ?? '')}
                onValueChange={(v) => field.onChange(Number(v) || 0)}
                type='number'
                label='端口'
                placeholder='465'
                description='SSL 常用 465，STARTTLS 常用 587'
              />
            )}
          />
          <Controller
            control={control}
            name='secure'
            render={({ field }) => (
              <SwitchCard
                {...field}
                value={field.value}
                onValueChange={field.onChange}
                label='SSL 直连'
                description='关闭则使用 STARTTLS'
              />
            )}
          />
        </div>
        <Controller
          control={control}
          name='user'
          render={({ field }) => (
            <Input {...field} label='邮箱账号' placeholder='your@qq.com' description='SMTP 登录账号，通常与发件邮箱相同' />
          )}
        />
        <Controller
          control={control}
          name='pass'
          render={({ field }) => (
            <Input {...field} type='password' label='密码 / 授权码' placeholder='QQ 邮箱需使用授权码' description='保存后回显为 ******，留空表示不修改' />
          )}
        />
        <Controller
          control={control}
          name='from'
          render={({ field }) => (
            <Input {...field} label='发件人（可选）' placeholder='留空则使用邮箱账号' description='显示在邮件 From 头' />
          )}
        />
        <Controller
          control={control}
          name='to'
          render={({ field }) => (
            <Input {...field} label='收件人' placeholder='a@example.com,b@example.com' description='多个收件人用逗号或分号分隔' />
          )}
        />
        <div className='flex flex-col gap-4 md:flex-row'>
          <Controller
            control={control}
            name='notifyOffline'
            render={({ field }) => (
              <SwitchCard
                {...field}
                value={field.value}
                onValueChange={field.onChange}
                label='掉线提醒'
                description='QQ 掉线时发邮件'
              />
            )}
          />
          <Controller
            control={control}
            name='notifyRecover'
            render={({ field }) => (
              <SwitchCard
                {...field}
                value={field.value}
                onValueChange={field.onChange}
                label='恢复提醒'
                description='QQ 重新上线时发邮件'
              />
            )}
          />
        </div>
        <Controller
          control={control}
          name='cooldownMinutes'
          render={({ field }) => (
            <Input
              {...field}
              value={String(field.value ?? '')}
              onValueChange={(v) => field.onChange(Number(v) || 0)}
              type='number'
              label='提醒冷却（分钟）'
              description='同一状态切换在该时间窗口内不重复发信'
            />
          )}
        />
        <div className='flex flex-wrap gap-3'>
          <Button color='primary' variant='flat' isLoading={testing} onPress={onTest}>
            发送测试邮件
          </Button>
        </div>
      </div>
      <SaveButtons
        onSubmit={onSubmit}
        reset={() => loadConfig(true)}
        isSubmitting={isSubmitting}
        refresh={() => loadConfig(true)}
      />
    </>
  );
};

export default MailConfigCard;

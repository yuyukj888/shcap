import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { LuPackage } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

export default function PluginStorePage () {
  const navigate = useNavigate();

  return (
    <section className='w-full max-w-3xl mx-auto py-8 px-2 md:px-6'>
      <title>插件商店 - SHCAP WebUI</title>
      <Card className='backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm rounded-2xl bg-white/60 dark:bg-black/40'>
        <CardBody className='py-8 px-6 md:px-10'>
          <div className='flex flex-col gap-4'>
            <div className='flex items-center gap-3'>
              <LuPackage className='w-7 h-7 text-primary' />
              <h2 className='text-2xl font-semibold'>插件商店已停用</h2>
            </div>
            <p className='text-default-600 dark:text-default-400 leading-7'>
              SHCAP 是 NapCat 的延续版，但上游 NapCat 仓库（NapNeko/NapCatQQ）已被删除，
              其插件索引
              <code className='mx-1 px-1.5 py-0.5 rounded bg-default-100 dark:bg-default-50/50 text-sm'>
                napcat-plugin-index
              </code>
              也随之失效：无论直连还是加速镜像，都拿不到有效的索引内容，因此这里不再提供在线商店。
            </p>
            <p className='text-default-600 dark:text-default-400 leading-7'>
              如果你需要安装插件，可以在「插件管理」里直接上传插件压缩包（zip），
              或在 GitHub 上搜索对应插件仓库后下载 Release 包手动安装。
            </p>
            <div className='flex gap-3'>
              <Button color='primary' radius='full' onPress={() => navigate('/plugins')}>
                前往插件管理
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}

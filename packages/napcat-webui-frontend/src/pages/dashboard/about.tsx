import { Card, CardBody, CardHeader } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Divider } from '@heroui/divider';
import { Image } from '@heroui/image';
import { Spinner } from '@heroui/spinner';
import { useRequest } from 'ahooks';
import {
  BsCodeSlash,
  BsCpu,
  BsGlobe,
  BsGithub,
  BsPlugin,
} from 'react-icons/bs';
import { IoRocketSharp } from 'react-icons/io5';

import logo from '@/assets/images/logo.png';
import WebUIManager from '@/controllers/webui_manager';

function VersionInfo () {
  const { data, loading, error } = useRequest(WebUIManager.GetNapCatVersion);

  return (
    <div className='flex items-center gap-2'>
      {error
        ? (
          <Chip color='danger' variant='flat' size='sm'>{error.message}</Chip>
        )
        : loading
          ? (
            <Spinner size='sm' color='default' />
          )
          : (
            <div className='flex items-center gap-2'>
              <Chip size='sm' color='default' variant='flat' className='text-default-500'>WebUI v0.0.6</Chip>
              <Chip size='sm' color='primary' variant='flat'>Core {data?.version}</Chip>
            </div>
          )}
    </div>
  );
}

export default function AboutPage () {
  const features = [
    {
      icon: <IoRocketSharp size={20} />,
      title: '高性能架构',
      desc: 'Node.js + Native 混合架构，资源占用低，响应速度快。',
      className: 'bg-primary-50 text-primary',
    },
    {
      icon: <BsGlobe size={20} />,
      title: '全平台支持',
      desc: '适配 Windows、Linux 及 Docker 环境。',
      className: 'bg-success-50 text-success',
    },
    {
      icon: <BsCodeSlash size={20} />,
      title: 'OneBot 11',
      desc: '深度集成标准协议，兼容现有生态。',
      className: 'bg-warning-50 text-warning',
    },
    {
      icon: <BsPlugin size={20} />,
      title: '极易扩展',
      desc: '提供丰富的 API 接口与 WebHook 支持。',
      className: 'bg-secondary-50 text-secondary',
    },
  ];

    const cardStyle = 'bg-default/40 backdrop-blur-lg border-none shadow-none';

  return (
    <div className='flex flex-col h-full w-full gap-6 p-2 md:p-6'>
      <title>关于 - SHCAP WebUI</title>

      {/* 头部标题区 */}
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-bold flex items-center gap-3 text-default-900'>
          <Image src={logo} alt='SHCAP Logo' width={32} height={32} />
          关于 SHCAP
        </h1>
        <div className='flex items-center gap-4 text-small text-default-500'>
          <p>NapCat 的延续版 · 现代化、轻量级 QQ 机器人协议端</p>
          <Divider orientation='vertical' className='h-4' />
          <VersionInfo />
        </div>
      </div>

      <Divider className='opacity-50' />

      {/* 主内容区：双栏布局 */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow'>

        {/* 左侧：介绍与特性 */}
        <div className='lg:col-span-2 space-y-6'>
          <Card shadow='sm' className={cardStyle}>
            <CardHeader className='pb-0 pt-4 px-4 flex-col items-start'>
              <h2 className='text-lg font-bold'>项目简介</h2>
            </CardHeader>
            <CardBody className='py-6 flex flex-col items-center justify-center gap-4'>
              <Image src={logo} alt='SHCAP' width={220} className='rounded-2xl' />
              <p className='text-small text-default-500 text-center max-w-xl leading-relaxed'>
                SHCAP 是 NapCat（NapNeko/NapCatQQ）4.18.42 的延续版本，在保持 OneBot 11
                协议与插件生态兼容的前提下，独立维护与持续更新：内置蓝色主题与 SH 品牌、
                支持 Docker 一键部署、并附带登录失败 / 掉线邮件告警能力。
              </p>
            </CardBody>
          </Card>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {features.map((item, index) => (
              <Card key={index} shadow='sm' className={cardStyle}>
                <CardBody className='flex flex-row items-start gap-4 p-4'>
                  <div className={`p-3 rounded-lg ${item.className}`}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className='font-semibold text-default-900'>{item.title}</h3>
                    <p className='text-small text-default-500 mt-1'>{item.desc}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        {/* 右侧：信息与链接 */}
        <div className='space-y-6'>

          <Card shadow='sm' className={cardStyle}>
            <CardHeader className='pb-0 pt-4 px-4'>
              <h2 className='text-lg font-bold flex items-center gap-2'>
                <BsGlobe /> 快捷链接
              </h2>
            </CardHeader>
            <CardBody className='py-4 gap-2'>
              <a
                className='flex items-center gap-3 rounded-medium px-3 py-2 hover:bg-default-100 transition-colors'
                href='https://github.com/yuyukj888/shcap'
                rel='noreferrer noopener'
                target='_blank'
              >
                <BsGithub className='text-xl text-default-600' />
                <div className='flex flex-col'>
                  <span className='text-small font-medium'>GitHub 仓库</span>
                  <span className='text-tiny text-default-400'>github.com/yuyukj888/shcap</span>
                </div>
              </a>
              <a
                className='flex items-center gap-3 rounded-medium px-3 py-2 hover:bg-default-100 transition-colors'
                href='https://qm.qq.com/q/K6l1ifjGQG'
                rel='noreferrer noopener'
                target='_blank'
              >
                <svg
                  aria-hidden='true'
                  className='shrink-0 text-primary'
                  fill='currentColor'
                  height='22'
                  viewBox='0 0 24 24'
                  width='22'
                >
                  <path d='M21.395 15.035a39.548 39.548 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.24c0 .274.013.804.014.836l-1.08 2.695a38.97 38.97 0 0 0-.802 2.264c-1.021 3.283-.314 4.654.222 4.812.448.132 1.389-.757 2.28-2.263.394.868.86 1.738 1.429 2.573-.684.293-1.31.71-1.706 1.187-.383.462-.53.985-.34 1.495.19.51.72.793 1.398.793.32 0 .67-.062 1.052-.19.658-.223 1.194-.6 1.687-1.108.443.087.897.134 1.362.134.465 0 .92-.047 1.363-.134.49.508 1.028.885 1.686 1.108.383.128.732.19 1.052.19.677 0 1.208-.283 1.397-.793.19-.51.043-1.033-.34-1.495-.396-.477-1.021-.894-1.705-1.187a15.27 15.27 0 0 0 1.428-2.573c.891 1.506 1.832 2.395 2.28 2.263.536-.158 1.243-1.529.222-4.812z' />
                </svg>
                <div className='flex flex-col'>
                  <span className='text-small font-medium'>QQ 交流群</span>
                  <span className='text-tiny text-default-400'>点击加入 QQ 群</span>
                </div>
              </a>
            </CardBody>
          </Card>

          <Card shadow='sm' className={cardStyle}>
            <CardHeader className='pb-0 pt-4 px-4'>
              <h2 className='text-lg font-bold flex items-center gap-2'>
                <BsCpu /> 技术栈
              </h2>
            </CardHeader>
            <CardBody className='py-4'>
              <div className='flex flex-wrap gap-2'>
                {['TypeScript', 'React', 'Vite', 'Node.js', 'Electron', 'HeroUI'].map((tech) => (
                  <Chip key={tech} size='sm' variant='flat' className='bg-default-100/50 text-default-600'>
                    {tech}
                  </Chip>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* 底部版权 - 移出 grid 布局 */}
      <div className='w-full text-center text-tiny text-default-400 py-4 mt-auto flex flex-col items-center gap-1'>
        <p>SHCAP © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}

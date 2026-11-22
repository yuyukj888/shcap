import { serverRequest } from '@/utils/request';

export interface MailConfigData {
  enable: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
  notifyOffline: boolean;
  notifyRecover: boolean;
  /** 容器停止（运行 napcat 巡检脚本时生效） */
  notifyContainerDown?: boolean;
  /** OneBot 接口连续失败（运行 napcat 巡检脚本时生效） */
  notifyUnreachable?: boolean;
  /** 已废弃：看门狗不再按冷却窗口压制提醒 */
  cooldownMinutes?: number;
}

export interface MailConfigResponse {
  config: MailConfigData;
  ready: boolean;
}

export interface MailTestResponse {
  to: string;
  success: boolean;
  message: string;
  sentAt?: string;
}

export default class MailManager {
  public static async getConfig () {
    const data = await serverRequest.get<ServerResponse<MailConfigResponse>>('/Mail/GetConfig');
    return data.data.data;
  }

  public static async saveConfig (config: Partial<MailConfigData>) {
    const data = await serverRequest.post<ServerResponse<MailConfigResponse>>('/Mail/SaveConfig', {
      config,
    });
    return data.data.data;
  }

  public static async test (to: string) {
    const data = await serverRequest.post<ServerResponse<MailTestResponse>>('/Mail/Test', { to });
    return data.data.data;
  }
}

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
  cooldownMinutes: number;
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

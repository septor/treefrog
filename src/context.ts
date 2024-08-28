import { Config } from './config';
import { Database } from './database';

export interface Context {
    config: Config;
    database: Database;
}

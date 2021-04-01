import 'babel-polyfill';
import { Router } from 'express';

import dialplanRouter from './dialplan.routes';

const routes = Router();

routes.use('/dialplan', dialplanRouter);

export default routes;

import { Router } from 'express';
import fs from 'fs';
import contentDisposition from 'content-disposition';

import path from 'path';
import AppError from '../errors/AppError';

const dialplanRouter = Router();

dialplanRouter.post('/', async (request, response) => {
    const { ramal, ramais } = request.body;

    if (!(ramais instanceof Array)) {
        throw new AppError('Ramais está no formato errado, deve ser um array de ramais');
    }

    const titulo = `exten => _${ramal},1,NoOp(//////////----------Context: Call to Peers ----------//////////)`;
    // eslint-disable-next-line no-template-curly-in-string,no-useless-concat
    const pickup = `same => n,AGI(/var/lib/asterisk/agi-bin/snep/resolv_pickup_group.php,` + '${EXTEN})';
    // eslint-disable-next-line no-template-curly-in-string,no-useless-concat
    const noop = `same => n,` + 'NoOp(Grupo de Captura: ${PICKUPGROUP})';
    // eslint-disable-next-line no-template-curly-in-string,no-useless-concat
    const set = `same => n,` + 'Set(__PICKUPMARK=${PICKUPGROUP})';
    // eslint-disable-next-line no-template-curly-in-string,no-useless-concat
    const linha1 = `same => n,Macro(dialCallPeers,${ramal})`;
    // eslint-disable-next-line no-template-curly-in-string,no-useless-concat
    const audio = `same => n,Playback` + '(${audioNotAnswered})';
    const hangup = `same => n,Hangup()`;

    const dialplan: string[] = [];

    dialplan.push(titulo, pickup, noop, set, linha1);

    ramais.forEach(array => {
        if (array !== 'XXXX' && array !== ramal) {
            // eslint-disable-next-line no-template-curly-in-string,no-useless-concat
            const peerNext = `same => n,Macro(dialCallPeers,${array})`;
            dialplan.push(peerNext);
        }
    });

    dialplan.push(audio, hangup);

    let text = '';

    dialplan.forEach(array => {
        text = text.concat(`${array}\n`);
    });

    const tmpFolder = path.resolve(__dirname, '..', '..', 'tmp');

    await fs.writeFile(`${tmpFolder}/text.txt`, text, err => {
        console.log(err);
    });

    // console.log(text);

    await fs.readFile(`${tmpFolder}/text.txt`, async err => {
        if (err) {
            throw new AppError('Algo esta errado com o arquivo gerado, não foi possível ler');
        }

        await response.writeHead(200, {
            'Content-Disposition': contentDisposition('Dialplan.txt'),
            'Content-Transfer-Encoding': 'binary',
            'Content-Type': 'application/octet-stream',
        });

        const readStream = await fs.createReadStream(`${tmpFolder}/text.txt`);
        await readStream.pipe(response);
        await readStream.on('error', error => {
            console.log(error);
        });
    });
});

export default dialplanRouter;

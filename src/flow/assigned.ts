// flow-assigned.ts
import { Simas } from '../service/simas'

interface DecryptedBody {
    screen?: string;
    data?: any;
    version?: string;
    action: string;
    flow_token?: number;
}

const getEmployeeFromToken = async (flow_token?: number) => {
    if (!flow_token) return null;
    try {
        return await Simas.employee(flow_token);
    } catch {
        return null;
    }
};

export const getNextScreenAssigned = async (decryptedBody: DecryptedBody) => {
    const { screen, data, action, flow_token } = decryptedBody;

    if (action === 'ping') {
        return { screen: 'PING', data: { status: 'active' } };
    }

    if (data?.error) {
        return { screen: 'ERROR', data: { acknowledged: true } };
    }

    if (action === 'INIT') {
        const readyBooks = await Simas.getReadyBooks();
        const employee = await getEmployeeFromToken(flow_token);

        return {
            screen: 'DETAILS',
            data: {
                books: readyBooks.map((asset: any) => ({
                    id: String(asset.id),
                    title: asset.code + ' - ' + asset.name,
                })),
                employee_name: employee?.full_name,
                employee_id: employee?.id_employee,
            },
        };
    }

    if (action === 'data_exchange') {
        switch (screen) {
            case 'DETAILS': {
                const readyBooks = await Simas.getReadyBooks();
                const employee = await getEmployeeFromToken(flow_token);

                const selected = readyBooks.find(
                    (asset: any) => String(asset.id) === data.book
                );

                if (!selected || !employee) {
                    return { screen: 'ERROR', data: {} };
                }

                return {
                    screen: 'CONFIRM',
                    data: {
                        name: employee.full_name,
                        employee_id: String(employee.id_employee),
                        asset_id: String(selected.id),
                        serial_number: selected.code,
                        book_title: selected.name,
                        planned_return_date: data.planned_return_date,
                        reason: data.reason,
                    },
                };
            }

            case 'CONFIRM': {
                const assetId = Number(data.asset_id);

                if (!assetId || Number.isNaN(assetId)) {
                    console.error('Invalid assetId from CONFIRM data:', data);
                    return {
                        screen: 'ERROR',
                        data: { message: 'Invalid book selected' },
                    };
                }

                await Simas.addHolder(assetId, data.employee_id, data.reason);

                return {
                    screen: 'COMPLETE',
                    data: {
                        extension_message_response: {
                            params: { flow_token: flow_token || '' },
                        },
                    },
                };
            }
        }
    }

    throw new Error('Unhandled request for assigned flow');
};
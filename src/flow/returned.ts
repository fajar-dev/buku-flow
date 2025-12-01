// flow-returned.ts
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

export const getNextScreenReturned = async (decryptedBody: DecryptedBody) => {
    const { screen, data, action, flow_token } = decryptedBody;

    if (action === 'ping') {
        return { screen: 'PING', data: { status: 'active' } };
    }

    if (data?.error) {
        return { screen: 'ERROR', data: { acknowledged: true } };
    }

    if (action === 'INIT') {
        const employee = await getEmployeeFromToken(flow_token);
        
        // Ambil daftar asset yang dipinjam employee ini
        const borrowedBooks = await Simas.getBookByEmployee(employee?.id_employee);

        return {
            screen: 'RETURN_DETAILS',
            data: {
                books: borrowedBooks.map((asset: any) => ({
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
            case 'RETURN_DETAILS': {
                const employee = await getEmployeeFromToken(flow_token);
                const borrowedBooks = await Simas.getBookByEmployee(employee?.id_employee);

                const selected = borrowedBooks.find(
                    (asset: any) => String(asset.id) === data.book
                );

                if (!selected || !employee) {
                    return { screen: 'ERROR', data: {} };
                }

                return {
                    screen: 'RETURN_CONFIRM',
                    data: {
                        name: employee.full_name,
                        employee_id: String(employee.id_employee),
                        asset_id: String(selected.id),
                        serial_number: selected.code,
                        book_title: selected.name,
                    },
                };
            }

            case 'RETURN_CONFIRM': {
                const assetId = Number(data.asset_id);

                if (!assetId || Number.isNaN(assetId)) {
                    return {
                        screen: 'ERROR',
                        data: { message: 'Invalid book selected' },
                    };
                }

                await Simas.returnAsset(assetId, data.employee_id);

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

    throw new Error('Unhandled request for returned flow');
};
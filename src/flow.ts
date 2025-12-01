// flow.ts
import { Simas } from './service/simas'

interface Book {
    id: string;
    title: string;
}

interface DetailsData {
    books: Book[];
    employee_name?: string;
    employee_id?: string;
}

interface ConfirmData {
    name: string;
    employee_id: string;
    book: string;
    planned_return_date: string;
    reason: string;
}

interface CompleteData {
    extension_message_response?: {
        params: {
            flow_token: string;
        };
    };
}

interface ScreenResponse<T = any> {
    screen: string;
    data: T;
}

interface DecryptedBody {
    screen?: string;
    data?: any;
    version?: string;
    action: string;
    flow_token?: string;
}

const getEmployeeFromToken = async (flow_token?: string) => {
    if (!flow_token) return null;
    try {
        return await Simas.employee(flow_token);
    } catch {
        return null;
    }
};

export const getNextScreen = async (
    decryptedBody: DecryptedBody
): Promise<ScreenResponse> => {
    const { screen, data, action, flow_token } = decryptedBody;

    // PING
    if (action === 'ping') {
        return { screen: 'PING', data: { status: 'active' } };
    }

    // ERROR dari client
    if (data?.error) {
        return { screen: 'ERROR', data: { acknowledged: true } };
    }

    // STEP 1: INIT → kirim DETAILS dengan books dari DB
    if (action === "INIT") {
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

    // STEP 2: DATA_EXCHANGE
    if (action === "data_exchange") {
        switch (screen) {
            case "DETAILS": {
                const readyBooks = await Simas.getReadyBooks();
                const employee = await getEmployeeFromToken(flow_token);

                const selected = readyBooks.find(
                    (asset: any) => String(asset.id) === data.book
                );

                if (!selected || !employee) {
                    return { screen: 'ERROR', data: {} };
                }

                const confirmData: ConfirmData = {
                    name: employee.full_name,
                    employee_id: String(employee.id_employee),
                    book: selected.name,
                    planned_return_date: data.planned_return_date,
                    reason: data.reason,
                };

                return { screen: 'CONFIRM', data: confirmData };
            }

            case "CONFIRM": {
                const d = data as ConfirmData;

                await Simas.addHolder(Number(d.book), d.employee_id, d.reason);

                return {
                    screen: 'COMPLETE',
                    data: {
                        extension_message_response: {
                        params: { flow_token: flow_token || '' },
                        },
                    },
                };
            }

            default:
                break;
        }
    }

    console.error("Unhandled request body:", decryptedBody);
    throw new Error(
        "Unhandled endpoint request. Make sure you handle the request action & screen logged above."
    );
};

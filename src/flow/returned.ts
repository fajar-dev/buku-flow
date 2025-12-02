import { Simas } from '../service/simas';

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

    asset_id: string;
    serial_number: string;
    book_title: string;
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
        return await Simas.employee(Number(flow_token));
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

    // STEP 1: INIT (form pengembalian)
    if (action === 'INIT') {
        const employee = await getEmployeeFromToken(flow_token);

        if (!employee) {
            return { screen: 'ERROR', data: {} };
        }

        // Ambil buku yang sedang dipinjam karyawan ini
        const borrowedBooks = await Simas.getBorrowedBooksByEmployee(
            String(employee.id_employee)
        );

        return {
            screen: 'DETAILS',
            data: {
                books: borrowedBooks.map((asset: any) => ({
                    id: String(asset.id),
                    title: asset.code + ' - ' + asset.name,
                })),
                employee_name: employee.full_name,
                employee_id: employee.id_employee,
            } as DetailsData,
        };
    }

    // STEP 2: DATA_EXCHANGE
    if (action === 'data_exchange') {
        switch (screen) {
            case 'DETAILS': {
                const employee = await getEmployeeFromToken(flow_token);

                if (!employee) {
                    return { screen: 'ERROR', data: {} };
                }

                const borrowedBooks = await Simas.getBorrowedBooksByEmployee(
                    String(employee.id_employee)
                );

                const selected = borrowedBooks.find(
                    (asset: any) => String(asset.id) === data.book
                );

                if (!selected) {
                    return { screen: 'ERROR', data: {} };
                }

                const confirmData: ConfirmData = {
                    name: employee.full_name,
                    employee_id: String(employee.id_employee),

                    asset_id: String(selected.id),
                    serial_number: selected.code,
                    book_title: selected.name,
                };

                return { screen: 'CONFIRM', data: confirmData };
            }

            case 'CONFIRM': {
                const d = data as ConfirmData;
                const assetId = Number(d.asset_id);

                if (!assetId || Number.isNaN(assetId)) {
                    return { screen: 'ERROR', data: {} };
                }

                await Simas.returnBook(assetId, d.employee_id);

                return {
                    screen: 'COMPLETE',
                    data: {
                        extension_message_response: {
                            params: { flow_token: flow_token || '' },
                        },
                    } as CompleteData,
                };
            }

            default:
                break;
        }
    }

    console.error('Unhandled request body:', decryptedBody);
    throw new Error(
        'Unhandled endpoint request. Make sure you handle the request action & screen logged above.'
    );
};

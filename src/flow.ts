// flow.ts
import { Simas } from './service/simas'

interface Book {
    id: string;
    title: string;
}

interface DetailsData {
    books: Book[];
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

// TEMPLATE UNTUK CONFIRM & COMPLETE
const SCREEN_RESPONSES = {
    CONFIRM: {
        screen: "CONFIRM",
        data: {
            name: "John Doe",
            employee_id: "EMP12345",
            book: "Belajar Internet Dasar",
            planned_return_date: "2025-12-31",
            reason: "Untuk belajar jaringan komputer.",
        } as ConfirmData,
    } as ScreenResponse<ConfirmData>,
    COMPLETE: {
        screen: "COMPLETE",
        data: {} as CompleteData,
    } as ScreenResponse<CompleteData>,
};

export const getNextScreen = async (
    decryptedBody: DecryptedBody
): Promise<ScreenResponse> => {
    const { screen, data, action, flow_token } = decryptedBody;

    // health check
    if (action === "ping") {
        return {
            screen: "PING",
            data: {
                status: "active",
            },
        };
    }

    // kalau client kirim error
    if (data?.error) {
        console.warn("Received client error:", data);
        return {
            screen: "ERROR",
            data: {
                acknowledged: true,
            },
        };
    }

    // STEP 1: INIT → kirim DETAILS dengan books dari DB
    if (action === "INIT") {
        const readyBooks = await Simas.getReadyBooks();

        const books: Book[] = readyBooks.map((asset: any) => ({
            id: String(asset.id),   // id asset dari DB, dikirim ke client
            title: asset.code + ' - ' + asset.name,      // nama asset sebagai judul buku
        }));

        const detailsResponse: ScreenResponse<DetailsData> = {
            screen: "DETAILS",
            data: {
                books,
            },
        };

        return detailsResponse;
    }

    // STEP 2: DATA_EXCHANGE
    if (action === "data_exchange") {
        switch (screen) {
            case "DETAILS": {
                // data.book berisi ID asset (string) yang dipilih user di UI
                const readyBooks = await Simas.getReadyBooks();

                const selectedAsset = readyBooks.find(
                    (asset: any) => String(asset.id) === data.book
                );

                if (!selectedAsset) {
                    throw new Error("Invalid book selection");
                }

                // sementara name & employee_id masih hardcode;
                // nanti bisa diganti ambil dari context / API / Simas.employee(phone)
                return {
                    ...SCREEN_RESPONSES.CONFIRM,
                    data: {
                        name: "John Doe",
                        employee_id: "EMP12345",
                        book: selectedAsset.name,
                        planned_return_date: data.planned_return_date,
                        reason: data.reason,
                    },
                };
            }

            case "CONFIRM": {
                console.log("Saving book borrowing:", data);

                // Di sini kamu bisa panggil Simas.addHolder kalau data sudah lengkap
                //
                // Contoh (kalau front-end kirim book_id & employee_id):
                //
                // const assetId = Number(data.book_id);
                // const employeeId = Number(data.employee_id);
                // await Simas.addHolder(assetId, employeeId);

                return {
                    ...SCREEN_RESPONSES.COMPLETE,
                    data: {
                        extension_message_response: {
                            params: {
                                flow_token: flow_token || "",
                            },
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

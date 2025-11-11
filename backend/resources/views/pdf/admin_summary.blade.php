<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
        }

        h1 {
            font-size: 18px;
            margin-bottom: 4px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
        }

        th,
        td {
            border: 1px solid #444;
            padding: 6px;
            text-align: left;
        }

        .num {
            text-align: right;
        }
    </style>
</head>

<body>
    <h1>Ringkasan Penjualan ({{ $scope }})</h1>
    <p>Periode: {{ $from }} s/d {{ $to }} ({{ $days }} hari)</p>
    <table>
        <tr>
            <th>Revenue</th>
            <td class="num">Rp {{ number_format($revenue, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <th>Cost</th>
            <td class="num">Rp {{ number_format($cost, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <th>Profit</th>
            <td class="num">Rp {{ number_format($profit, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <th>Qty Sold</th>
            <td class="num">{{ $qty }}</td>
        </tr>
        <tr>
            <th>Orders Completed</th>
            <td class="num">{{ $orders_completed }}</td>
        </tr>
        <tr>
            <th>Avg Store Rating</th>
            <td class="num">{{ $avg_store_rating }}</td>
        </tr>
        <tr>
            <th>New Users</th>
            <td class="num">{{ $new_users }}</td>
        </tr>
    </table>
    <p style="margin-top:24px;">Generated at: {{ date('Y-m-d H:i:s') }}</p>
</body>

</html>

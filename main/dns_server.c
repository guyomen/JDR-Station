#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "lwip/sockets.h"
#include "esp_netif.h"
#include "esp_log.h"
#include "dns_server.h"

#define DNS_PORT    53
#define DNS_BUF_LEN 512

typedef struct __attribute__((packed)) {
    uint16_t id, flags, qdcount, ancount, nscount, arcount;
} dns_header_t;

static const char *TAG = "dns";
static uint32_t s_ip; /* ordre réseau */

/* Transforme la requête (dans buf) en réponse ; renvoie la longueur ou -1. */
static int build_reply(uint8_t *buf, int len)
{
    if (len < (int)sizeof(dns_header_t)) return -1;
    dns_header_t *h = (dns_header_t *)buf;
    uint16_t flags = ntohs(h->flags);
    if ((flags & 0x8000) || ntohs(h->qdcount) < 1) return -1;

    /* On ne traite que la première question. */
    uint8_t *p = buf + sizeof(dns_header_t), *end = buf + len;
    while (p < end && *p) {
        if (*p & 0xC0) return -1; /* pas de compression dans une question */
        p += *p + 1;
    }
    if (p + 5 > end) return -1;
    p++;
    uint16_t qtype = (p[0] << 8) | p[1];
    p += 4;
    int out = p - buf;

    h->flags = htons(0x8000 | 0x0400 | (flags & 0x0100) | 0x0080); /* QR AA RD RA */
    h->qdcount = htons(1);
    h->ancount = 0;
    h->nscount = 0;
    h->arcount = 0;

    if (qtype == 1 /* A */ && out + 16 <= DNS_BUF_LEN) {
        uint8_t *a = buf + out;
        a[0] = 0xC0; a[1] = 0x0C;                 /* nom = pointeur vers la question */
        a[2] = 0;    a[3] = 1;                    /* type A */
        a[4] = 0;    a[5] = 1;                    /* classe IN */
        a[6] = 0; a[7] = 0; a[8] = 0; a[9] = 60;  /* TTL 60 s */
        a[10] = 0;   a[11] = 4;
        memcpy(a + 12, &s_ip, 4);
        out += 16;
        h->ancount = htons(1);
    }
    return out;
}

static void dns_task(void *arg)
{
    int sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(DNS_PORT),
        .sin_addr.s_addr = htonl(INADDR_ANY),
    };
    if (sock < 0 || bind(sock, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        ESP_LOGE(TAG, "Impossible d'ouvrir le port 53");
        if (sock >= 0) close(sock);
        vTaskDelete(NULL);
        return;
    }

    uint8_t buf[DNS_BUF_LEN];
    for (;;) {
        struct sockaddr_in from;
        socklen_t from_len = sizeof(from);
        int len = recvfrom(sock, buf, sizeof(buf), 0, (struct sockaddr *)&from, &from_len);
        if (len <= 0) continue;
        int out = build_reply(buf, len);
        if (out > 0) sendto(sock, buf, out, 0, (struct sockaddr *)&from, from_len);
    }
}

void dns_server_start(void)
{
    esp_netif_ip_info_t ip;
    esp_netif_t *ap = esp_netif_get_handle_from_ifkey("WIFI_AP_DEF");
    ESP_ERROR_CHECK(esp_netif_get_ip_info(ap, &ip));
    s_ip = ip.ip.addr;
    xTaskCreate(dns_task, "dns", 3072, NULL, 5, NULL);
}

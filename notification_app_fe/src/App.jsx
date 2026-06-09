import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { fetchNotifications } from "./api";

const NOTIFICATION_TYPES = ["", "Event", "Result", "Placement"];
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

function formatTimestamp(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function getNotificationType(notification) {
  return notification.notification_type || notification.type || notification.Type || "Unknown";
}

function getNotificationMessage(notification) {
  return notification.message || notification.Message || notification.title || notification.Notification || "Untitled notification";
}

function getNotificationTime(notification) {
  return notification.timestamp || notification.Timestamp || notification.createdAt || notification.time || "";
}

function getNotificationKey(notification, index) {
  return notification.id || notification.ID || notification._id || `${getNotificationType(notification)}-${index}`;
}

function NotificationCard({ notification, index }) {
  const type = getNotificationType(notification);
  const message = getNotificationMessage(notification);
  const timestamp = formatTimestamp(getNotificationTime(notification));

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid rgba(29, 78, 216, 0.12)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,250,255,1))"
      }}
    >
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: type === "Placement" ? "#16a34a" : type === "Result" ? "#7c3aed" : "#0f766e" }}>
                {type.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6">{type}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Notification #{index + 1}
                </Typography>
              </Box>
            </Stack>
            <Chip label={type} size="small" color="primary" variant="outlined" />
          </Stack>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {message}
          </Typography>
          <Divider />
          <Typography variant="body2" color="text.secondary">
            {timestamp}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function NotificationTable({ notifications }) {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid rgba(15, 23, 42, 0.08)" }}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: "rgba(29, 78, 216, 0.05)" }}>
            <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>Message</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>Timestamp</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {notifications.map((notification, index) => {
            const type = getNotificationType(notification);
            const message = getNotificationMessage(notification);
            const timestamp = formatTimestamp(getNotificationTime(notification));

            return (
              <TableRow key={getNotificationKey(notification, index)} hover>
                <TableCell>
                  <Chip
                    label={type}
                    color={type === "Placement" ? "success" : type === "Result" ? "secondary" : "info"}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell sx={{ maxWidth: 520, fontWeight: 600 }}>{message}</TableCell>
                <TableCell>{timestamp}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [selectedType, setSelectedType] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [notifications, setNotifications] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadNotifications() {
      setLoading(true);
      setError("");

      try {
        const response = await fetchNotifications({
          page,
          limit,
          notificationType: selectedType,
          signal: controller.signal
        });

        setNotifications(response.items);
        setTotalCount(response.total);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setError(fetchError.message || "Failed to load notifications");
          setNotifications([]);
          setTotalCount(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadNotifications();

    return () => controller.abort();
  }, [page, limit, selectedType]);

  const totalPages = useMemo(() => {
    if (!totalCount || !limit) {
      return null;
    }

    return Math.max(1, Math.ceil(totalCount / limit));
  }, [totalCount, limit]);

  const stats = useMemo(() => {
    const counts = notifications.reduce(
      (accumulator, notification) => {
        const type = getNotificationType(notification);
        accumulator[type] = (accumulator[type] || 0) + 1;
        return accumulator;
      },
      { Event: 0, Result: 0, Placement: 0 }
    );

    return [
      { label: "On page", value: notifications.length },
      { label: "Placement", value: counts.Placement || 0 },
      { label: "Result", value: counts.Result || 0 },
      { label: "Event", value: counts.Event || 0 }
    ];
  }, [notifications]);

  return (
    <Box sx={{ minHeight: "100vh", background: "radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 32%), linear-gradient(180deg, #eff6ff 0%, #f8fbff 45%, #eef4ff 100%)" }}>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
          background: "linear-gradient(135deg, rgba(30,64,175,0.98), rgba(15,118,110,0.96))",
          color: "white"
        }}
      >
        <Container maxWidth="xl" sx={{ py: { xs: 5, md: 7 } }}>
          <Stack spacing={3}>
            <Stack spacing={1.25} sx={{ maxWidth: 760 }}>
              <Chip label="Stage 2 React + MUI" sx={{ alignSelf: "flex-start", bgcolor: "rgba(255,255,255,0.15)", color: "white" }} />
              <Typography variant="h3" component="h1">
                Campus Notifications
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
                Browse notifications with server-side pagination and type filtering.
              </Typography>
            </Stack>
            <Grid container spacing={2}>
              {stats.map((stat) => (
                <Grid item xs={6} md={3} key={stat.label}>
                  <Paper elevation={0} sx={{ p: 2, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", color: "white", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="h5">{stat.value}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: "1px solid rgba(15, 23, 42, 0.08)" }}>
          <Stack spacing={3}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
            >
              <Stack spacing={0.5}>
                <Typography variant="h5">Notification Feed</Typography>
                <Typography variant="body2" color="text.secondary">
                  Use the filters to load notifications by type and page.
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <FormControl sx={{ minWidth: 180 }} size="small">
                  <InputLabel id="notification-type-label">Notification Type</InputLabel>
                  <Select
                    labelId="notification-type-label"
                    value={selectedType}
                    label="Notification Type"
                    onChange={(event) => {
                      setSelectedType(event.target.value);
                      setPage(1);
                    }}
                  >
                    {NOTIFICATION_TYPES.map((type) => (
                      <MenuItem key={type || "all"} value={type}>
                        {type || "All Types"}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 140 }} size="small">
                  <InputLabel id="page-size-label">Rows</InputLabel>
                  <Select
                    labelId="page-size-label"
                    value={limit}
                    label="Rows"
                    onChange={(event) => {
                      setLimit(Number(event.target.value));
                      setPage(1);
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <MenuItem key={size} value={size}>
                        {size}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Stack>

            {error ? <Alert severity="error">{error}</Alert> : null}

            {loading ? (
              <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
                <CircularProgress />
                <Typography color="text.secondary">Loading notifications...</Typography>
              </Stack>
            ) : notifications.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="h6" gutterBottom>
                  No notifications found
                </Typography>
                <Typography color="text.secondary">
                  Try another notification type or page size.
                </Typography>
              </Paper>
            ) : isMobile ? (
              <Stack spacing={2}>
                {notifications.map((notification, index) => (
                  <NotificationCard
                    key={getNotificationKey(notification, index)}
                    notification={notification}
                    index={index}
                  />
                ))}
              </Stack>
            ) : (
              <NotificationTable notifications={notifications} />
            )}

            <Toolbar disableGutters sx={{ px: 0, flexWrap: "wrap", gap: 2, justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                Showing {notifications.length} item{notifications.length === 1 ? "" : "s"}
                {totalCount != null ? ` out of ${totalCount}` : ""}
              </Typography>

              {totalPages ? (
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                  shape="rounded"
                />
              ) : (
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" disabled={page <= 1} onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}>
                    Previous
                  </Button>
                  <Button variant="contained" disabled={notifications.length < limit} onClick={() => setPage((currentPage) => currentPage + 1)}>
                    Next
                  </Button>
                </Stack>
              )}
            </Toolbar>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

export default App;